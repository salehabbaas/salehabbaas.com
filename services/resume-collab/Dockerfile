FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY services/resume-collab ./services/resume-collab

ENV NODE_ENV=production
CMD ["node", "services/resume-collab/server.mjs"]
