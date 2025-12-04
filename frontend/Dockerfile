FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs
RUN chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
