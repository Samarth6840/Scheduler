FROM docker.elastic.co/elasticsearch/elasticsearch:8.13.4
ENV discovery.type=single-node
ENV xpack.security.enabled=false
ENV ES_JAVA_OPTS="-Xms1024m -Xmx1024m"
EXPOSE 9200