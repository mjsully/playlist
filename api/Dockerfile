FROM python:3.12-alpine

LABEL org.opencontainers.image.source=https://github.com/mjsully/playlist-api 

WORKDIR /app/

COPY requirements.txt .

RUN pip3 install -r requirements.txt

COPY *.py .

ENTRYPOINT ["uvicorn", "run:app", "--host", "0.0.0.0"]
