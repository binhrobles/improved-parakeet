FROM node:alpine

WORKDIR /usr/src/app

# install current packages
COPY package.json .
COPY yarn.lock .
RUN yarn --production

# copy source code
COPY . .

EXPOSE 8000
CMD ["yarn", "start"]
