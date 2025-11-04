FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY web ./web
RUN mkdir -p /app/data/cache && chown -R node:node /app
USER node
ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
