FROM node

WORKDIR /home/node/

COPY ./package*.json .

RUN npm install

COPY next.config.js .
COPY ./src/ ./src/

# CMD npm run build && npm run start
CMD npm run dev