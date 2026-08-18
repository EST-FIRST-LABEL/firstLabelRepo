"""등록 승인 권한 점검: python -m tests.test_registrations_auth (backend/ 에서 실행)

이슈 #11: /api/v1/registrations/{id}/approve 는 로그인만 확인하고 운영자 권한을
확인하지 않아, 등록 ID를 아는 아무 사용자나 제품을 승인할 수 있었다.
ADMIN_LOGIN_IDS 에 없는 사용자는 403을 받아야 한다.
"""
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

_tmp_db = Path(tempfile.gettempdir()) / "firstlabel_test_registrations.db"
_tmp_db.unlink(missing_ok=True)
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp_db}"
os.environ["ADMIN_LOGIN_IDS"] = "adminuser01"
os.environ.setdefault("JWT_SECRET", "test-only-secret")

from fastapi.testclient import TestClient  # noqa: E402

from app.core.db import init_db  # noqa: E402
from app.main import app  # noqa: E402

init_db()
client = TestClient(app)


def _signup(login_id: str) -> str:
    r = client.post(
        "/api/v1/auth/signup",
        json={
            "nickname": "테스터",
            "login_id": login_id,
            "password": "Passw0rd!",
            "password_confirm": "Passw0rd!",
        },
    )
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _create_registration(token: str) -> int:
    r = client.post(
        "/api/v1/registrations",
        data={"product_name": "테스트 상품"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_non_admin_cannot_approve():
    token = _signup("regularuser1")
    reg_id = _create_registration(token)
    r = client.post(f"/api/v1/registrations/{reg_id}/approve", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403, r.text


def test_admin_can_approve():
    admin_token = _signup("adminuser01")
    reg_id = _create_registration(admin_token)
    r = client.post(f"/api/v1/registrations/{reg_id}/approve", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "DONE"


def test_unauthenticated_cannot_approve():
    token = _signup("regularuser3")
    reg_id = _create_registration(token)
    r = client.post(f"/api/v1/registrations/{reg_id}/approve")
    assert r.status_code == 401, r.text


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for fn in fns:
        fn()
        print(f"  ok  {fn.__name__}")
    print(f"\n{len(fns)} passed")
