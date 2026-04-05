from fastapi import FastAPI

app = FastAPI(title="Overfitted.io API", description="Backend satirique Print-on-Demand", version="0.1.0")

@app.get("/")
def root():
    return {"message": "Bienvenue sur l’API Overfitted.io. Lis la doc, humain."}
