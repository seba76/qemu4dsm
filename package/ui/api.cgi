#!/usr/bin/python
import logging
import logging.handlers  
from app import app
from wsgiref.handlers import CGIHandler

#logging.basicConfig(filename='/var/packages/qemu4dsm/target/ui/api.log',level=logging.DEBUG)
root_logger = logging.getLogger()
root_logger.setLevel(logging.DEBUG)
handler = logging.handlers.RotatingFileHandler('/var/packages/qemu4dsm/target/ui/api.log', maxBytes=2097152, backupCount=3, encoding='utf-8')
handler.setFormatter(logging.Formatter('%(asctime)s:%(levelname)s:%(name)s:%(message)s', datefmt='%m/%d/%Y %H:%M:%S'))
root_logger.handlers = [handler]  

if __name__ == '__main__':
    #app.run(host='0.0.0.0', port=8080)
    CGIHandler().run(app)
