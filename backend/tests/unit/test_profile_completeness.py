"""Required-field counting matches dashboard rules (see frontend profile-completeness.ts)."""

from app.models import CertificationEntry, EducationEntry, Position, Profile
from app.profile_completeness import count_required_empty_fields, profile_is_complete


def test_empty_profile_has_many_missing():
    # 3 basic + experience section + education section + skills + languages
    assert count_required_empty_fields(Profile()) == 7


def test_minimal_complete_profile():
    p = Profile(
        full_name="Jane",
        summary="Dev",
        email="j@example.com",
        experience=[
            Position(title="Eng", company="Co", start_date="2020-01", end_date="Present"),
        ],
        education=[
            EducationEntry(
                school="Uni",
                degree="BSc",
                field="CS",
                start_date="2015",
                end_date="2019",
            ),
        ],
        skills=["Python"],
        languages=["English"],
    )
    assert count_required_empty_fields(p) == 0
    assert profile_is_complete(p) is True


def test_cert_row_requires_name():
    p = Profile(
        full_name="J",
        summary="S",
        email="a@b.c",
        experience=[Position(title="T", company="C", start_date="1", end_date="2")],
        education=[EducationEntry(school="U", degree="D", field="F", start_date="1", end_date="2")],
        skills=["x"],
        languages=["en"],
        certifications=[CertificationEntry(name="", authority="A", date="2020", url="http://x")],
    )
    assert count_required_empty_fields(p) == 1
