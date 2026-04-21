# AI Prompts Used

## System Prompt
Used to configure the ChatAgent to act as an AI resume assistant for Sai Praneeth Gilloju, containing his full background, education, work experience, skills, and availability.

## Development Prompts (Claude)

1. "Help me build a Cloudflare Workers AI application using the agents-starter template that acts as an AI resume assistant"

2. "Customize the server.ts file to replace the default agent with one that answers questions about my background using Llama 3.3"

3. "The system prompt should include my education at SUNY Poly, 5 years of software engineering experience at Entain, RAG research experience, and skills in C++, Java, SQL, Python"

4. "Add two tools: getContactInfo and getResumeSummary that return structured data about the candidate"

5. "Help me deploy this to Cloudflare Workers and set up the workers.dev subdomain"

6. "Fix the deployment error about workers.dev subdomain not being configured"

## Model Used
- @cf/meta/llama-3.3-70b-instruct-fp8-fast (Cloudflare Workers AI)
