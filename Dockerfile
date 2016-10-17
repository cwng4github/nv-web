FROM    node:5

WORKDIR /
RUN apt-get update
RUN apt-get install haproxy -y
COPY haproxy.cfg /etc/haproxy/haproxy.cfg

RUN mkdir -p /opt/certs
COPY us.blockchain.ibm.com.cert /opt/certs/blockchain.ibm.com.pem

RUN mkdir -p /cp-demo
COPY . /cp-demo/
RUN cd /cp-demo ; npm install --production
WORKDIR /cp-demo
COPY ibm-blockchain-js_index.js /cp-demo/node_modules/ibm-blockchain-js/index.js

RUN chmod +x start.sh

EXPOSE 3000
CMD ["/cp-demo/start.sh"]

