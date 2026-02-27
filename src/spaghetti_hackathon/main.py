from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from .database import engine, get_db, Base
from . import schemas, crud

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Debate Prep API", version="1.0.0")

# CORS (allow Vite dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def camel_response(data, status_code: int = 200):
    """Return a JSONResponse with camelCase keys."""
    if isinstance(data, list):
        json_data = [
            schemas.CamelModel.model_validate(item).model_dump(mode="json", by_alias=True)
            if isinstance(item, dict) else item
            for item in data
        ]
    elif isinstance(data, dict):
        json_data = data
    else:
        json_data = data
    return JSONResponse(content=json_data, status_code=status_code)


# --- Preparations ---

@app.get("/api/preparations")
def list_preparations(db: Session = Depends(get_db)):
    results = crud.get_preparations(db)
    return [schemas.PreparationResponse.model_validate(r).model_dump(mode="json", by_alias=True) for r in results]


@app.post("/api/preparations", status_code=201)
def create_preparation(data: schemas.PreparationCreate, db: Session = Depends(get_db)):
    result = crud.create_preparation(db, data)
    return JSONResponse(
        content=schemas.PreparationResponse.model_validate(result).model_dump(mode="json", by_alias=True),
        status_code=201,
    )


@app.get("/api/preparations/{prep_id}")
def get_preparation(prep_id: str, db: Session = Depends(get_db)):
    result = crud.get_preparation(db, prep_id)
    if not result:
        raise HTTPException(status_code=404, detail="Preparation not found")
    return schemas.PreparationResponse.model_validate(result).model_dump(mode="json", by_alias=True)


@app.put("/api/preparations/{prep_id}")
def update_preparation(prep_id: str, data: schemas.PreparationUpdate, db: Session = Depends(get_db)):
    result = crud.update_preparation(db, prep_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Preparation not found")
    return schemas.PreparationResponse.model_validate(result).model_dump(mode="json", by_alias=True)


@app.delete("/api/preparations/{prep_id}", status_code=204)
def delete_preparation(prep_id: str, db: Session = Depends(get_db)):
    if not crud.delete_preparation(db, prep_id):
        raise HTTPException(status_code=404, detail="Preparation not found")
    return None


# --- Opponents ---

@app.get("/api/opponents")
def list_opponents(db: Session = Depends(get_db)):
    results = crud.get_all_opponents(db)
    return [schemas.OpponentResponse.model_validate(r).model_dump(mode="json", by_alias=True) for r in results]
