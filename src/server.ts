import { createWorkersAI } from "workers-ai-provider";
import { callable, routeAgentRequest, type Schedule } from "agents";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
  tool,
  type ModelMessage
} from "ai";
import { z } from "zod";

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
    const mcpTools = this.mcp.getAITools();
    const workersai = createWorkersAI({ binding: this.env.AI });

    const result = streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        sessionAffinity: this.sessionAffinity
      }),
      system: `You are an AI assistant representing Sai Praneeth Gilloju, a Master's student in Data Science & Analytics at SUNY Polytechnic Institute in Utica, NY. Answer questions about his background, skills, experience, and qualifications as if you are his personal AI career assistant.

ABOUT SAI PRANEETH:
- Name: Sai Praneeth Gilloju
- Email: gillojs@sunypoly.edu
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
   - Evaluated 13 configuration variables: Faithfulness, Context Precision, Recall@k
   - Built OpenWebUI Python installer with Docker API integration (Mac + Windows)
   - Uses Claude and ChatGPT daily as AI coding partners

2. Senior Software Engineer, Entain - IVY Comptech (Nov 2021 - Feb 2025)
   - 5 years building production features in C++/MFC for live gaming platform
   - Built full Twitch API integration: real-time data pipeline, async state management
   - Wrote Oracle SQL scripts for production database releases
   - Debugged production incidents end-to-end across data, API, and UI layers

3. Software Engineer / Trainee, Entain - IVY Comptech (Mar 2020 - Nov 2021)
   - Built production UI features, SQL data preparation, incident debugging

TECHNICAL SKILLS:
- Languages: C, C++, Java, Oracle SQL, Python (learning), R (learning), Angular (basic)
- AI/LLM: RAG evaluation, LLM output testing, prompt engineering, RAGAS, TruLens
- Tools: GitHub, Docker, Visual Studio, Jira
- AI Tools: Claude, ChatGPT, GitHub Copilot (daily use)

PROJECTS:
- cf-ai-resume-assistant: This app! Built on Cloudflare Workers AI with Llama 3.3
- Big Data Dashboard: github.com/gillojusai/bigdata_dashboard (Python)
- Unreal Engine Sliding Tile Puzzle: github.com/gillojusai/GaTask1-Unreal (C++)

AVAILABILITY:
- Available June 2026 for summer internships
- Open to remote or relocation
- CPT authorization - no sponsorship needed for internships

Be friendly and professional. If asked something not covered, direct them to gillojs@sunypoly.edu.`,
      messages: pruneMessages({
        messages: inlineDataUrls(await convertToModelMessages(this.messages)),
        toolCalls: "before-last-2-messages"
      }),
      tools: {
        ...mcpTools,
        getContactInfo: tool({
          description: "Get Sai Praneeth's contact information",
          inputSchema: z.object({}),
          execute: async () => ({
            email: "gillojs@sunypoly.edu",
            phone: "+1 (978) 265-3347",
            linkedin: "linkedin.com/in/sai-praneeth-gilloju",
            github: "github.com/gillojusai",
            location: "Utica, NY"
          })
        }),
        getResumeSummary: tool({
          description: "Get a structured summary of Sai Praneeth's resume",
          inputSchema: z.object({}),
          execute: async () => ({
            name: "Sai Praneeth Gilloju",
            degree: "MS Data Science & Analytics",
            school: "SUNY Polytechnic Institute",
            gpa: "3.81/4.0",
            yearsOfExperience: 5,
            topSkills: ["C++", "Java", "Oracle SQL", "LLM Evaluation", "RAG Systems", "Docker", "Python (learning)"],
            availableFrom: "June 2026",
            workAuthorization: "F-1/CPT - No sponsorship needed for internships"
          })
        })
      },
      stopWhen: stepCountIs(5),
      abortSignal: options?.abortSignal
    });

    return result.toUIMessageStreamResponse();
  }

  async executeTask(description: string, _task: Schedule<string>) {
    console.log(`Executing scheduled task: ${description}`);
    this.broadcast(
      JSON.stringify({
        type: "scheduled-task",
        description,
        timestamp: new Date().toISOString()
      })
    );
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
