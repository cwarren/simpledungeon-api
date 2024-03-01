FROM node:16

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock) files
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy local code to the container image.
COPY . .

# Run the web service on container startup.
CMD [ "node", "server.js" ]
