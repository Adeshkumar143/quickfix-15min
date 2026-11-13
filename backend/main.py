import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./quickfix.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class PartnerDB(Base):
    __tablename__ = "partners"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    phone = Column(String)
    skill = Column(String)
    is_approved = Column(Boolean, default=False)

class BookingDB(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String)
    customer_phone = Column(String)
    service_type = Column(String)
    address = Column(String)
    price = Column(Integer)
    commission = Column(Float)
    status = Column(String, default="Searching for Partner (15-Min)")
    partner_name = Column(String, default="Not Assigned")

Base.metadata.create_all(bind=engine)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class PartnerCreate(BaseModel):
    name: str
    phone: str
    skill: str

class BookingCreate(BaseModel):
    customer_name: str
    customer_phone: str
    service_type: str
    address: str
    price: int

@app.get("/")
def home():
    return {"status": "Live"}

@app.post("/register-partner")
def register_partner(partner: PartnerCreate, db: Session = Depends(get_db)):
    db.add(PartnerDB(name=partner.name, phone=partner.phone, skill=partner.skill))
    db.commit()
    return {"message": "Registered"}

@app.get("/partners")
def get_partners(db: Session = Depends(get_db)):
    return {"partners": db.query(PartnerDB).all()}

@app.get("/partner-login/{phone}")
def partner_login(phone: str, db: Session = Depends(get_db)):
    partner = db.query(PartnerDB).filter(PartnerDB.phone == phone).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Not found")
    return {"partner": partner}

@app.put("/approve-partner/{partner_id}")
def approve_partner(partner_id: int, db: Session = Depends(get_db)):
    partner = db.query(PartnerDB).filter(PartnerDB.id == partner_id).first()
    partner.is_approved = True
    db.commit()
    return {"message": "Approved"}

@app.post("/book-service")
def book_service(booking: BookingCreate, db: Session = Depends(get_db)):
    new_b = BookingDB(
        customer_name=booking.customer_name,
        customer_phone=booking.customer_phone,
        service_type=booking.service_type,
        address=booking.address,
        price=booking.price,
        commission=round(booking.price * 0.20, 2)
    )
    db.add(new_b)
    db.commit()
    return {"message": "Booked"}

@app.get("/bookings")
def get_bookings(db: Session = Depends(get_db)):
    return {"bookings": db.query(BookingDB).order_by(BookingDB.id.desc()).all()}

@app.put("/accept-order/{booking_id}/{partner_name}")
def accept_order(booking_id: int, partner_name: str, db: Session = Depends(get_db)):
    b = db.query(BookingDB).filter(BookingDB.id == booking_id).first()
    b.status = "Partner Accepted - Arriving in 15 Mins"
    b.partner_name = partner_name
    db.commit()
    return {"message": "Accepted"}

@app.put("/complete-order/{booking_id}")
def complete_order(booking_id: int, db: Session = Depends(get_db)):
    b = db.query(BookingDB).filter(BookingDB.id == booking_id).first()
    b.status = "Completed & Paid"
    db.commit()
    return {"message": "Completed"}
