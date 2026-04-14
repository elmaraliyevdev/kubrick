from typing import Any, Dict

from jinja2 import Environment, StrictUndefined, select_autoescape

_env = Environment(
    autoescape=select_autoescape(["html", "xml"]),
    undefined=StrictUndefined,
)


def render_email_template(template_str: str, context: Dict[str, Any]) -> str:
    return _env.from_string(template_str).render(**context)


def build_merge_context(
    *,
    candidate_first_name: str | None,
    candidate_last_name: str | None,
    candidate_email: str | None,
    job_title: str,
    organization_name: str,
    recruiter_first_name: str | None,
    recruiter_last_name: str | None,
) -> Dict[str, Any]:
    first = (candidate_first_name or "").strip()
    last = (candidate_last_name or "").strip()
    name = f"{first} {last}".strip() or (candidate_email or "there")
    r_first = (recruiter_first_name or "").strip()
    r_last = (recruiter_last_name or "").strip()
    recruiter_name = f"{r_first} {r_last}".strip() or "The hiring team"
    return {
        "candidate_first_name": first or "there",
        "candidate_last_name": last,
        "candidate_name": name,
        "candidate_email": candidate_email or "",
        "job_title": job_title,
        "organization_name": organization_name,
        "recruiter_name": recruiter_name,
    }


def append_tracking_pixel(html: str, tracking_pixel_url: str) -> str:
    pixel = (
        f'<img src="{tracking_pixel_url}" width="1" height="1" alt="" '
        'style="display:block;border:0;outline:none;text-decoration:none" />'
    )
    lower = html.lower()
    if "</body>" in lower:
        idx = lower.rfind("</body>")
        return html[:idx] + pixel + html[idx:]
    return html + pixel
