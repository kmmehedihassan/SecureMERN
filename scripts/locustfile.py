from locust import HttpUser, task, between
import random
import twofactor

# Replace these with a real test user you pre‐register:
TEST_EMAIL    = "loadtest@secure.com"
TEST_PASSWORD = "Password123!"

class SecureMernUser(HttpUser):
    wait_time = between(0.5, 1.5)  # simulate real user think time

    def on_start(self):
        # on start, log in once to get a valid access token
        # you must have already registered TEST_EMAIL in your test DB
        # and fetched its twoFASecret. For simplicity, hard‐code the secret:
        twoFASecret = "<PLACE_YOUR_TEST_USER_SECRET_HERE>"
        totp = twofactor.generateToken(twoFASecret).token

        res = self.client.post(
            "/api/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "twoFactorCode": totp
            },
            catch_response=True,
        )
        if res.status_code == 200:
            self.access_token = res.json()["accessToken"]
        else:
            res.failure(f"Login failed: {res.status_code}")

    @task(3)
    def me_endpoint(self):
        # hit the /me endpoint under the same session
        self.client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {self.access_token}"},
            catch_response=True,
        )

    @task(1)
    def login_endpoint(self):
        # occasionally re-login with fresh TOTP
        twoFASecret = "<PLACE_YOUR_TEST_USER_SECRET_HERE>"
        totp = twofactor.generateToken(twoFASecret).token
        self.client.post(
            "/api/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "twoFactorCode": totp
            },
            catch_response=True,
        )
