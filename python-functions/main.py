"""
main.py — Customer-Service Agent (v3.2)
Fully self-contained Cloud Functions (Gen 2) implementation.
"""

import os
import json
import logging
import sys
import traceback
from datetime import datetime
from typing import Any, Dict, List

from firebase_admin import initialize_app
from firebase_functions import https_fn, firestore_fn

# --------------------------------------------------------------------------- #
#  Boot-strap & basic logging                                                 #
# --------------------------------------------------------------------------- #
initialize_app()

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s %(levelname)s %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("customer_service_agent")

# --------------------------------------------------------------------------- #
#  Helper: make Firestore / datetime objects JSON-safe                        #
# --------------------------------------------------------------------------- #
def to_json_safe(v: Any) -> Any:
    if hasattr(v, "to_datetime"):               # Firestore Timestamp
        try:
            return v.to_datetime().isoformat()
        except Exception:
            pass
    if isinstance(v, datetime):
        return v.isoformat()
    if isinstance(v, dict):
        return {k: to_json_safe(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [to_json_safe(x) for x in v]
    return v


# --------------------------------------------------------------------------- #
#  Health / test endpoint                                                     #
# --------------------------------------------------------------------------- #
@https_fn.on_request(
    region="australia-southeast1",
    memory=256,
    secrets=["OPENAI_API_KEY", "PINECONE_API_KEY"],
)
def http_function(req):
    if req.path in ("/health", "/_ah/health"):
        return https_fn.Response(
            json.dumps({"ok": True}),
            200,
            {"Content-Type": "application/json"},
        )
    return https_fn.Response("Running", 200)


# --------------------------------------------------------------------------- #
#  Firestore trigger: customer_service_agent_handler                          #
# --------------------------------------------------------------------------- #
@firestore_fn.on_document_created(
    document="merchants/{merchantId}/pushemails/{emailId}",
    region="australia-southeast1",
    memory=1024,
    timeout_sec=540,
    secrets=["OPENAI_API_KEY", "PINECONE_API_KEY"],
)
def customer_service_agent_handler(event):
    """Entry-point for each new push-email document."""
    import asyncio
    from agents import (
        set_default_openai_key,
        set_default_openai_api,
        set_tracing_disabled,
    )

    try:
        set_default_openai_key(os.getenv("OPENAI_API_KEY"))
        set_default_openai_api("responses")
        set_tracing_disabled(True)
        return asyncio.run(_process_email(event))
    except Exception as exc:
        logger.error("Handler error: %s\n%s", exc, traceback.format_exc())
        return {"success": False, "error": str(exc)}


# --------------------------------------------------------------------------- #
#  Core async pipeline                                                        #
# --------------------------------------------------------------------------- #
async def _process_email(event) -> Dict[str, Any]:
    import asyncio
    from firebase_admin import firestore
    from openai import OpenAI
    from pinecone import Pinecone
    from agents import Agent, Runner, WebSearchTool
    from pydantic import BaseModel

    params = event.params
    merchant_id = params["merchantId"]
    email_id = params["emailId"]

    # 1️⃣  Raw email ----------------------------------------------------------
    raw_doc = await asyncio.get_event_loop().run_in_executor(
        None, lambda: event.data.to_dict()
    )
    email_body: str = raw_doc.get("body", "")
    logger.debug("Email chars: %d", len(email_body))

    # 2️⃣  Merchant instructions ---------------------------------------------
    db = firestore.client()
    instr_ref = (
        f"merchants/{merchant_id}/customer-service-agent/instructions"
    )
    instr_doc = await asyncio.get_event_loop().run_in_executor(
        None, lambda: db.document(instr_ref).get()
    )
    instruct_blob = json.dumps(to_json_safe(instr_doc.to_dict() or {}))

    # 3️⃣  Pinecone context ---------------------------------------------------
    oc = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

    emb = await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: oc.embeddings.create(
            model="text-embedding-3-large", input=email_body[:8192]
        ),
    )
    vec = emb.data[0].embedding
    idx = pc.Index("taployaltylarge")
    matches = idx.query(
        vector=vec,
        top_k=20,
        namespace=f"{merchant_id}customerservice",
        include_metadata=True,
    ).get("matches", [])
    #  Debug raw matches
    logger.debug("Pinecone matches raw: %s", matches)

    context_snippets: List[str] = [
        m.get("metadata", {}).get("text")
        or m.get("metadata", {}).get("content", "")
        for m in matches
        if m.get("score", 0) > 0.5
    ]
    kb_blob = "\n\n".join(context_snippets)

    # 4️⃣  Planner — mandatory search topics ---------------------------------
    trigger_map = {
        "weather": [
            "weather",
            "forecast",
            "temperature",
            "rain",
            "sunny",
            "wind",
        ],
        "events": ["event", "race", "ride", "competition"],
        "opening_hours": [
            "opening hours",
            "open on",
            "store hours",
            "what time",
        ],
        "stock_price": ["price", "cost", "discount", "how much"],
        "stock_availability": ["in stock", "availability", "available"],
        "public_holiday": ["public holiday", "holiday hours"],
        "currency": ["exchange rate", "currency", "convert", "in aud"],
    }

    lower_body = email_body.lower()
    mandatory_topics = [
        topic
        for topic, keys in trigger_map.items()
        if any(k in lower_body for k in keys)
    ]
    mandatory_section = (
        "none" if not mandatory_topics else "\n".join(f"• {t}" for t in mandatory_topics)
    )

    # 5️⃣  Tools -------------------------------------------------------------
    search_tool = WebSearchTool(
        user_location={
            "type": "approximate",
            "country": "AU",
            "city": "Melbourne",
            "region": "Victoria",
        }
    )
    tools = [search_tool]

    # 6️⃣  Schemas -----------------------------------------------------------
    class EmailAnalysis(BaseModel):
        ongoing_conversation: bool
        thread_summary: str
        conversation_topic: str
        customer_request: str
        email_title: str
        brief_summary: str

    class EmailClassification(BaseModel):
        is_customer_inquiry: bool
        reasoning: str

    class CustomerServiceResponse(BaseModel):
        response_text: str
        weather_included: bool

    # 7️⃣  Analyzer ----------------------------------------------------------
    analyzer = Agent(
        name="Analyzer",
        instructions="Extract structured fields from the email.",
        model="gpt-4o",
        output_type=EmailAnalysis,
    )
    analyzer_prompt = (
        f"Instructions:\n{instruct_blob}\n\n"
        f"Context:\n{kb_blob}\n\n"
        f"Email:\n{email_body}"
    )
    analyzer_out = await Runner.run(analyzer, analyzer_prompt)

    # 8️⃣  Classifier --------------------------------------------------------
    classifier = Agent(
        name="Classifier",
        instructions="Determine if the email requires a response.",
        model="gpt-4o",
        output_type=EmailClassification,
    )
    classifier_prompt = (
        f"Instructions:\n{instruct_blob}\n\n"
        f"Context:\n{kb_blob}\n\n"
        f"Analysis:\n{analyzer_out.final_output.model_dump_json()}"
    )
    classifier_out = await Runner.run(classifier, classifier_prompt)

    # 9️⃣  Responder ---------------------------------------------------------
    responder_rules = (
        "You are a senior customer-service representative.\n\n"
        "Mandatory `web_search` topics detected:\n"
        f"{mandatory_section}\n\n"
        "Rules:\n"
        "1. For each listed topic (unless 'none'), CALL `web_search` "
        "   exactly once and integrate concise results with citation.\n"
        "2. You MAY call `web_search` for any other question you cannot "
        "   answer from Instructions or Context, but total calls ≤ 3.\n"
        "3. Never leave placeholders like '[searching...]'.\n"
        "4. Seamlessly weave any results into a warm, professional reply.\n"
    )
    responder = Agent(
        name="Responder",
        instructions=responder_rules,
        model="gpt-4o",
        tools=tools,
        output_type=CustomerServiceResponse,
    )
    responder_prompt = (
        f"Instructions:\n{instruct_blob}\n\n"
        f"Context:\n{kb_blob}\n\n"
        f"Analysis:\n{analyzer_out.final_output.model_dump_json()}\n\n"
        f"Classification:\n{classifier_out.final_output.model_dump_json()}"
    )
    responder_out = await Runner.run(responder, responder_prompt)

    # 🔟  Capture tool-calls (SDK 0.4 and 0.3 compatible) --------------------
    tool_calls: List[Any] = []

    if hasattr(responder_out, "tool_calls"):
        tool_calls.extend(responder_out.tool_calls)

    if hasattr(responder_out, "steps"):  # older SDK
        for step in responder_out.steps:
            if getattr(step, "tool_calls", None):
                tool_calls.extend(step.tool_calls)

    web_calls = [tc for tc in tool_calls if tc.name == "web_search"]
    search_used = bool(web_calls)

    # Build detailed list for logging / Firestore
    web_search_results = []
    for tc in web_calls:
        result_text = getattr(tc, "result", None)
        web_search_results.append(
            {
                "query": tc.args.get("query", ""),
                "result": result_text[:500] if result_text else None,
            }
        )

    search_reason = (
        "Context sufficient" if not search_used else "; ".join(
            wc["query"] or "<no_query>" for wc in web_search_results
        )
    )

    # 🔟+1  Persist ----------------------------------------------------------
    firestore.client().document(
        f"merchants/{merchant_id}/pushemailresponses/{email_id}"
    ).set(
        {
            "response": responder_out.final_output.response_text,
            "analysis": json.dumps(
                {
                    "analysis": analyzer_out.final_output.model_dump(),
                    "classification": classifier_out.final_output.model_dump(),
                    "weather_included": responder_out.final_output.weather_included,
                    "web_search_used": search_used,
                    "web_search_reason": search_reason,
                    "web_search_results": web_search_results or None,
                }
            ),
            "created_at": datetime.utcnow().isoformat(),
            "status": "pending_review",
        }
    )

    return {
        "success": True,
        "response": responder_out.final_output.response_text,
        "web_search_used": search_used,
        "web_search_reason": search_reason,
    }
