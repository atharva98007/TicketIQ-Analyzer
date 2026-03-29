from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

# ---------------------------------------------------------
# 1. Define the Data Structures
# ---------------------------------------------------------

class IncomingTicket(BaseModel):
    ticket_id: str
    customer_name: str
    message: str

class TicketAnalysis(BaseModel):
    urgency: str = Field(description="Must be exactly: Low, Medium, High, or Critical")
    sentiment: str = Field(description="Must be exactly: Positive, Neutral, Negative, or Angry")
    category: str = Field(description="E.g., Billing, Technical Issue, Login Problem, Refund, Other")
    escalate: bool = Field(description="Set to true ONLY IF urgency is Critical OR sentiment is Angry")
    suggested_response: str = Field(description="A professional, empathetic draft response to the customer")
    reasoning: str = Field(description="A brief internal note on why the AI classified it this way")

# ---------------------------------------------------------
# 2. Setup the AI Model and Parser
# ---------------------------------------------------------

llm = ChatOllama(model="llama3.2:1b", format="json", temperature=0.1)

parser = JsonOutputParser(pydantic_object=TicketAnalysis)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an AI customer support triage agent. Your ONLY job is to analyze the ticket and output a valid JSON object. "
               "CRITICAL INSTRUCTIONS FOR ANALYSIS:\n"
               "1. Read the customer's message carefully.\n"
               "2. Do NOT default to 'High' or 'Critical' urgency. "
               "3. If it is a simple question or minor bug, urgency is 'Low' and sentiment is 'Neutral' or 'Positive'.\n"
               "4. Only use 'Critical' if the system is completely down or they are demanding a refund.\n\n"
               "Follow these formatting instructions strictly and output ONLY JSON:\n{format_instructions}"),
    ("user", "Customer Name: {customer_name}\nTicket Message: {message}\n\n"
             "Task: Analyze the message above and generate the JSON response reflecting the TRUE urgency and sentiment.")
])

agent_chain = prompt | llm | parser

# ---------------------------------------------------------
# 3. Setup the FastAPI Server
# ---------------------------------------------------------

app = FastAPI(title="Support Ticket AI Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# 4. Create the API Endpoint
# ---------------------------------------------------------

@app.post("/api/analyze-ticket")
async def analyze_ticket(ticket: IncomingTicket):
    try:
        # 1. Ask the AI to extract the data
        result = agent_chain.invoke({
            "customer_name": ticket.customer_name,
            "message": ticket.message,
            "format_instructions": parser.get_format_instructions()
        })
        
        # 2. --- THE FIX: Hardcoded Business Logic ---
        # We override the AI's 'escalate' guess with strict Python rules
        urgency = str(result.get("urgency", "")).lower()
        sentiment = str(result.get("sentiment", "")).lower()
        
        if urgency in ["high", "critical"] or sentiment == "angry":
            result["escalate"] = True
        else:
            result["escalate"] = False
        # --------------------------------------------

        return result
        
    except Exception as e:
        return {
            "urgency": "Medium",
            "sentiment": "Neutral",
            "category": "Error parsing AI",
            "escalate": True,
            "suggested_response": "AI processing failed. Please review manually.",
            "reasoning": f"AI Error: {str(e)}"
        }