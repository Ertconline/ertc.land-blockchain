

FROM node:14

RUN apt-get update

RUN mkdir -p /app

RUN mkdir -p /app/ERTC/runtime

COPY . /app

WORKDIR /app

RUN npm i --quiet --silent  \
    && npm i lodash --quiet --silent \
    && cd /app/plugins/iz3-bitcore-crypto \
    && npm i --quiet --silent \
    && chmod +x /app/ERTC/start.sh

EXPOSE 6801 6802

WORKDIR /app/ERTC
