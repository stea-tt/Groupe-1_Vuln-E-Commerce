FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs
RUN chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 5001
CMD ["node", "server.js"]
