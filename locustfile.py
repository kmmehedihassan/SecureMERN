from locust import HttpUser, task, between
import twofactor

EMAIL = "loaduser@example.com"
PASSWORD = "Password123!"

class AuthUser(HttpUser):
    wait_time = between(1, 2)  # pause 1–2 s between tasks

    def on_start(self):
        # 1) register a fresh user (you can also skip this if you have a pool of test users)
        self.client.post("/api/auth/register", json={
            "email": EMAIL, 
            "password": PASSWORD
        })
        # 2) perform login and grab tokens
        totp = twofactor.generateToken(self.user_twofa_secret).token
        resp = self.client.post("/api/auth/login", json={
            "email": EMAIL,
            "password": PASSWORD,
            "twoFactorCode": totp
        })
        # keep the JWT for subsequent calls
        self.token = resp.json()["accessToken"]
        self.client.headers.update({
            "Authorization": f"Bearer {self.token}"
        })

    @task(3)
    def view_profile(self):
        self.client.get("/api/auth/me")

    @task(1)
    def regen_2fa(self):
        self.client.post("/api/auth/2fa/regenerate")
