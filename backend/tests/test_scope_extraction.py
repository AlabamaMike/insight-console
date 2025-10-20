import pytest
from insight_console.agents.scope_extractor import ScopeExtractor

@pytest.fixture
def scope_extractor():
    return ScopeExtractor()

def test_extract_scope_from_text(scope_extractor: ScopeExtractor):
    """Test extracting scope from investment memo text"""
    memo_text = """
    Investment Memo: TechCo Acquisition

    We are evaluating TechCo, a B2B SaaS company with $10M ARR growing at 60% YoY.

    Key questions:
    1. Can they sustain 40%+ growth rates?
    2. What is the competitive landscape?
    3. Are unit economics improving?

    Hypotheses:
    - Enterprise expansion can drive higher NRR
    - CAC payback will improve with sales efficiency
    """

    result = scope_extractor.extract_scope(memo_text, sector="B2B SaaS", deal_type="buyout")

    assert "key_questions" in result
    assert len(result["key_questions"]) >= 2
    assert "hypotheses" in result
    assert len(result["hypotheses"]) >= 1
    assert "recommended_workflows" in result

def test_extract_scope_handles_empty_text(scope_extractor: ScopeExtractor):
    """Test that scope extraction handles empty or minimal text"""
    result = scope_extractor.extract_scope("", sector="Healthcare", deal_type="growth")

    # Should still return structure with defaults
    assert "key_questions" in result
    assert "hypotheses" in result
    assert "recommended_workflows" in result
