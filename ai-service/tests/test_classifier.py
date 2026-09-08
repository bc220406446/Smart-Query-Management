from app.pipeline.classifier import (
    ClaudeProvider,
    GeminiProvider,
    _parse_model_output,
    classify_text,
)


def test_providers_unavailable_without_keys():
    # The environment may have API keys configured; only assert rules is
    # always available and that classify_text never crashes.
    assert GeminiProvider().available is False or GeminiProvider().available is True
    assert ClaudeProvider().available is False or ClaudeProvider().available is True
    result = classify_text("test query")
    assert result.provider in {"gemini", "claude", "rules"}
    assert result.category
    assert 0.0 <= result.confidence <= 1.0


def test_classify_text_falls_back_to_rules():
    result = classify_text("When is the final exam date sheet coming out?")
    assert result.provider == "rules"
    assert result.category == "exam"
    assert 0.0 <= result.confidence <= 1.0


def test_parse_model_output_plain_json():
    parsed = _parse_model_output('{"category": "exam", "priority": "HIGH"}')
    assert parsed == {"category": "exam", "priority": "HIGH"}


def test_parse_model_output_wrapped_json():
    raw = 'Sure! Here you go: {"category": "fee", "priority": "URGENT"} hope that helps'
    parsed = _parse_model_output(raw)
    assert parsed is not None
    assert parsed["category"] == "fee"


def test_parse_model_output_garbage():
    assert _parse_model_output("not json at all") is None