FROM node:20.18
WORKDIR /app

COPY . .

ENV NODE_ENV=local

RUN ["npm", "install"]
EXPOSE 8000
ENTRYPOINT [ "node", "./dist/main.js" ]