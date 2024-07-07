# Base image
FROM node:20-alpine

# update alpine dependencies
RUN apk update && \
    apk add git && \
    rm -rf /var/cache/apk/*

# Specific timezone for current container
ENV TZ=Asia/Bangkok

# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Creates a "dist" folder with the production build
RUN npm run build

EXPOSE 3000

# Start the server using the production build
CMD [ "node", "dist/index.js" ]