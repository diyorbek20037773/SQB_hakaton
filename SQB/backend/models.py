import json
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from database import Base


def _dumps(obj):
    if obj is None:
        return None
    return json.dumps(obj, ensure_ascii=False)


def _loads(s):
    if s is None:
        return None
    if isinstance(s, (list, dict)):
        return s
    try:
        return json.loads(s)
    except Exception:
        return s


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(200), nullable=False)
    phone = Column(String(20), unique=True, nullable=False)
    segment = Column(String(20), default="Standard")          # VIP / Premium / Standard
    monthly_income = Column(Float, default=0.0)
    _existing_products = Column("existing_products", Text, default="[]")
    kyc_status = Column(String(20), default="pending")         # verified / pending / failed
    aml_risk_level = Column(String(20), default="low")         # low / medium / high
    credit_score = Column(Integer, default=600)
    age = Column(Integer, default=30)
    language_pref = Column(String(5), default="uz")            # uz / ru

    calls = relationship("Call", back_populates="customer")

    @property
    def existing_products(self):
        return _loads(self._existing_products)

    @existing_products.setter
    def existing_products(self, value):
        self._existing_products = _dumps(value)

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "phone": self.phone,
            "segment": self.segment,
            "monthly_income": self.monthly_income,
            "existing_products": self.existing_products,
            "kyc_status": self.kyc_status,
            "aml_risk_level": self.aml_risk_level,
            "credit_score": self.credit_score,
            "age": self.age,
            "language_pref": self.language_pref,
        }


class Operator(Base):
    __tablename__ = "operators"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(200), nullable=False)
    employee_id = Column(String(20), unique=True, nullable=False)
    department = Column(String(100), default="Retail")
    avg_satisfaction = Column(Float, default=4.0)
    total_calls = Column(Integer, default=0)
    conversion_rate = Column(Float, default=0.0)
    is_online = Column(Boolean, default=False)

    calls = relationship("Call", back_populates="operator")
    simulator_sessions = relationship("SimulatorSession", back_populates="operator")

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "employee_id": self.employee_id,
            "department": self.department,
            "avg_satisfaction": self.avg_satisfaction,
            "total_calls": self.total_calls,
            "conversion_rate": self.conversion_rate,
            "is_online": self.is_online,
        }


class Call(Base):
    __tablename__ = "calls"

    id = Column(Integer, primary_key=True, index=True)
    operator_id = Column(Integer, ForeignKey("operators.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="active")              # active / completed / missed
    transcript = Column(Text, default="")
    summary = Column(Text, default="")
    sentiment_score = Column(Float, default=0.0)               # -1 to 1
    compliance_score = Column(Float, default=100.0)            # 0-100
    _nbo_offered = Column("nbo_offered", Text, default="[]")
    nbo_accepted = Column(Boolean, default=False)
    _objections_detected = Column("objections_detected", Text, default="[]")
    satisfaction_rating = Column(Integer, nullable=True)       # 1-5
    _topics = Column("topics", Text, default="[]")

    operator = relationship("Operator", back_populates="calls")
    customer = relationship("Customer", back_populates="calls")
    compliance_events = relationship("ComplianceEvent", back_populates="call")

    @property
    def nbo_offered(self):
        return _loads(self._nbo_offered)

    @nbo_offered.setter
    def nbo_offered(self, value):
        self._nbo_offered = _dumps(value)

    @property
    def objections_detected(self):
        return _loads(self._objections_detected)

    @objections_detected.setter
    def objections_detected(self, value):
        self._objections_detected = _dumps(value)

    @property
    def topics(self):
        return _loads(self._topics)

    @topics.setter
    def topics(self, value):
        self._topics = _dumps(value)

    def to_dict(self):
        return {
            "id": self.id,
            "operator_id": self.operator_id,
            "customer_id": self.customer_id,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "status": self.status,
            "transcript": self.transcript,
            "summary": self.summary,
            "sentiment_score": self.sentiment_score,
            "compliance_score": self.compliance_score,
            "nbo_offered": self.nbo_offered,
            "nbo_accepted": self.nbo_accepted,
            "objections_detected": self.objections_detected,
            "satisfaction_rating": self.satisfaction_rating,
            "topics": self.topics,
        }


class ComplianceEvent(Base):
    __tablename__ = "compliance_events"

    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.id"), nullable=False)
    event_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), default="low")               # low / medium / high / critical
    timestamp = Column(DateTime, default=datetime.utcnow)
    resolved = Column(Boolean, default=False)

    call = relationship("Call", back_populates="compliance_events")

    def to_dict(self):
        return {
            "id": self.id,
            "call_id": self.call_id,
            "event_type": self.event_type,
            "description": self.description,
            "severity": self.severity,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "resolved": self.resolved,
        }


class SimulatorSession(Base):
    __tablename__ = "simulator_sessions"

    id = Column(Integer, primary_key=True, index=True)
    operator_id = Column(Integer, ForeignKey("operators.id"), nullable=False)
    persona_type = Column(String(30), default="confused")      # angry / confused / savvy
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    score = Column(Float, default=0.0)
    feedback = Column(Text, default="")
    transcript = Column(Text, default="")

    operator = relationship("Operator", back_populates="simulator_sessions")

    def to_dict(self):
        return {
            "id": self.id,
            "operator_id": self.operator_id,
            "persona_type": self.persona_type,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "score": self.score,
            "feedback": self.feedback,
            "transcript": self.transcript,
        }
