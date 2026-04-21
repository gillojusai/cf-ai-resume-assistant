# cf-ai-resume-assistant

An AI-powered resume assistant built on Cloudflare Workers AI. Chat with an AI agent that answers questions about Sai Praneeth Gilloju's background, skills, and experience.

## Live Demo
https://cf-ai-resume-assistant.gillojs.workers.dev

## What it does
- Answers recruiter questions about Sai's background using Llama 3.3
- Maintains conversation memory using Cloudflare Durable Objects
- Provides structured resume data via tool calls
- Built with Cloudflare Agents SDK

## Components
- **LLM**: Llama 3.3 via Cloudflare Workers AI
- **Memory/State**: Cloudflare Durable Objects (AIChatAgent)
- **Coordination**: Cloudflare Agents SDK
- **UI**: Chat interface via Cloudflare Pages

## How to run locally
npm install
npm run dev

## How to deploy
npm run deploy
