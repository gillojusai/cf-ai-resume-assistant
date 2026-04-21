import { createWorkersAI } from "workers-ai-provider";
import { callable, routeAgentRequest } from "agents";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
  type ModelMessage
} from "ai";

function inlineDataUrls(messages: ModelMessage[]): ModelMessage[] {
  return messages.map((msg) => {
    if (msg.role !== "user" || typeof msg.content === "string") return msg;
    return {
      ...msg,
      content: msg.content.map((part) => {
        if (part.type !== "file" || typeof part.data !== "string") return part;
        const match = part.data.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) return part;
        const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
        return { ...part, data: bytes, mediaType: match[1] };
      })
    };
  });
}

export class ChatAgent extends AIChatAgent<Env> {
  maxPersistedMessages = 100;

  onStart() {
    this.mcp.configureOAuthCallback({
      customHandler: (result) => {
        if (result.authSuccess) {
          return new Response("<script>window.close();</script>", {
            headers: { "content-type": "text/html" },
            status: 200
          });
        }
        return new Response(
          `Authentication Failed: ${result.authError || "Unknown error"}`,
          { headers: { "content-type": "text/plain" }, status: 400 }
        );
      }
    });
  }

  @callable()
  async addServer(name: string, url: string) {
    return await this.addMcpServer(name, url);
  }

  @callable()
  async removeServer(serverId: string) {
    await this.removeMcpServer(serverId);
  }

  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    const workersai = createWorkersAI({ binding: this.env.AI });

    const result = streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        sessionAffinity: this.sessionAffinity
      }),
      system: `You are an AI assistant representing Sai Praneeth Gilloju, a Master's student in Data Science & Analytics at SUNY Polytechnic Institute in Utica, NY. Answer questions about his background, skills, experience, and qualifications conversationally and helpfully.

ABOUT SAI PRANEETH:
- Name: Sai Praneeth Gilloju
- Email: gillojs@sunypoly.edu
- Phone: +1 (978) 265-3347
- LinkedIn: linkedin.com/in/sai-praneeth-gilloju
- GitHub: github.com/gillojusai
- Location: Utica, NY
- Status: F-1 student, authorized to work on CPT (no employer sponsorship needed for internships)

EDUCATION:
- MS Data Science & Analytics, SUNY Polytechnic Institute (GPA: 3.81/4.0, 2025-2026)
- Completed: Data Collection & Experimental Design (A), Data Analytics Tools (A), Visual Analytics (B+), Regression & ANOVA (A), Statistical Inference (A), Intro to Machine Learning (A), Big Data Platforms (B+)
- In progress: Artificial Intelligence, IoT, Quantum Systems
- BE Electronics & Communication Engineering, Guru Nanak Institutions (2014-2018)

WORK EXPERIENCE:
1. Graduate Assistant, SUNY Polytechnic Institute (Aug 2025 - Present)
   - Built RAG pipeline evaluation system using RAGAS and TruLens across 22 synthetic datasets
   - Evaluated 13 configuration variables measuring Faithfulness, Context Precision, Recall@k
   - Built OpenWebUI Python installer with Docker API integration for Mac and Windows
   - Uses Claude and ChatGPT daily as AI coding partners

2. Senior Software Engineer, Entain - IVY Comptech (Nov 2021 - Feb 2025)
   - 5 years building production features in C++ and MFC for live gaming platform
   - Built full Twitch API integration with real-time data pipeline and async state management
   - Wrote Oracle SQL scripts for production database releases
   - Debugged production incidents end-to-end across data, API, and UI layers

3. Software Engineer / Trainee, Entain - IVY Comptech (Mar 2020 - Nov 2021)
   - Built production UI features, SQL data preparation, incident debugging

TECHNICAL SKILLS:
- Languages: C, C++, Java, Oracle SQL, Python (learning - pandas, matplotlib), R (learning), Angular (basic)
- AI/LLM: RAG evaluation, LLM output testing, prompt engineering, RAGAS, TruLens, NLP concepts
- Tools: GitHub, Docker, Visual Studio, Jira, Microsoft Office
- AI Tools: Claude, ChatGPT, GitHub Copilot (daily use)

PROJECTS:
- cf-ai-resume-assistant: This app! Built on Cloudflare Workers AI with Llama 3.3, Durable Objects for memory
- Big Data Dashboard: github.com/gillojusai/bigdata_dashboard (Python data processing and visualization)
- Unreal Engine Sliding Tile Puzzle: github.com/gillojusai/GaTask1-Unreal (C++ game)
- RAG System Evaluation: 22 dataset AI research project using DoE methodology

AVAILABILITY:
- Available June 2026 for summer internships
- Open to remote or relocation
- CPT authorization means no sponsorship needed for internships

Be friendly, professional, and enthusiastic. Answer questions directly and helpfully.`,
      messages: pruneMessages({
        messages: inlineDataUrls(await convertToModelMessages(this.messages)),
        toolCalls: "before-last-2-messages"
      }),
      stopWhen: stepCountIs(5),
      abortSignal: options?.abortSignal
    });

    return result.toUIMessageStreamResponse();
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
