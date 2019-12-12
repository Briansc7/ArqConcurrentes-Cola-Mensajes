# ArqConcurrentes-Cola-Mensajes

El presente proyecto consiste en una cola de mensajes distribuida para la asignatura Implementación de Arquitecturas de Software Concurrentes.

La arquitectura propuesta para la implementación de la cola de mensajes distribuida se puede ver en el siguiente documento:
https://docs.google.com/document/d/1MhVP62zThtl572oQ4QjxKktykTekvo6cxefDcAEqDM4

El proyecto fue desarrollado en NodeJs, por lo que para poder utilizarlo hay que instalar el entorno correspondiente. Para ello se debe seguir los pasos del siguiente tutorial:
http://arquitecturas-concurrentes.github.io/guias/node/

#Pasos para probar la aplicación:

0) Si es la primera vez, clonar este repositorio y Eeecutar el comando npm install para instalar las dependencias necesarias.

Levantar los componentes en distintas consolas:
1) Levantar el Router con el comando node router.js

2) Levantar el orquestador con el comando node orquestador.js

3) Levantar los nodos de datos en distintas consolas con los comandos:
node nodo-datos.js nodo_datos1
node nodo-datos.js nodo_datos2

El nodo de datos 1 tiene la cola Alerts en modo PubSub y la cola Errors en modo RR (round robin).
El nodo de datos 2 tiene la cola Warnings en modo PubSub y la cola Details en modo RR (round robin).

Si se desean agregar más colas, se puede utilizar el siguiente http request:
Post http://localhost:8080/queue
El header debe tener la key Content-Type con el valor application/json.
El body debe ser un json como el siguiente:
{
	"topic": "Test",
	"mode": "RR",
	"datanode": "nodo_datos1"	
}

4) Levantar un consumidor especificando el topic al cual desea suscribirse.
Para suscribirse a Alerts, el comando sería el siguiente:
node consumidor.js Alerts

5) Levantar un productor y mandar un mensaje a un topic:
Para mandar el mensaje Hola al topic Alerts, el comando sería el siguiente:
node productor.js Alerts Hola


Nota: la configuración de los endpoints y colas con la que se levanta cada datanode se puede encontrar en el archivo config.json.



