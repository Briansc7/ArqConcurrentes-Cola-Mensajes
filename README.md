# ArqConcurrentes-Cola-Mensajes

El presente proyecto consiste en una cola de mensajes distribuida para la asignatura Implementación de Arquitecturas de Software Concurrentes.

La arquitectura propuesta para la implementación de la cola de mensajes distribuida se puede ver en el siguiente documento:
https://docs.google.com/document/d/1MhVP62zThtl572oQ4QjxKktykTekvo6cxefDcAEqDM4

El proyecto fue desarrollado en NodeJs, por lo que para poder utilizarlo hay que instalar el entorno correspondiente. Para ello se debe seguir los pasos del siguiente tutorial:
http://arquitecturas-concurrentes.github.io/guias/node/

##Pasos para probar la aplicación:

0) Si es la primera vez, clonar este repositorio y ejecutar el comando `npm install` para instalar las dependencias necesarias.

Levantar los componentes en distintas consolas:
1) Levantar el Router con el comando `node router.js`

2) Levantar los orquestadores en distintas consolas con los comandos:

`node orquestador.js orquestador1`

`node orquestador.js orquestador2`

3) Levantar los nodos de datos en distintas consolas con los comandos:

`node nodo-datos.js nodo_datos1`

`node nodo-datos.js nodo_datos2`

El nodo de datos 1 tiene la cola Alerts en modo PubSub y la cola Errors en modo RR (round robin).

El nodo de datos 2 tiene la cola Warnings en modo PubSub y la cola Details en modo RR (round robin).

Si se desean agregar más colas, se puede utilizar el siguiente http request:

`Post http://localhost:8080/queue`

El header debe tener la key `Content-Type` con el valor `application/json`.

El body debe ser un json como el siguiente:

`{	
	"topic": "Test",
	
	"mode": "RR",
	
	"maxSize": 10,
	
	"datanode": "nodo_datos1"	
}`

Siendo topic el nombre del tema para la cola, mode el modo de la cola que puede ser RR (round Robin) o PubSub, maxSize el limite de mensajes para la cola, y datanode el nombre del nodo de datos en donde se desea crear la cola.

4) Levantar un consumidor especificando el topic al cual desea suscribirse.

Para suscribirse a Alerts, el comando sería el siguiente:

`node consumidor.js Alerts`

5) Levantar un productor y mandar un mensaje a un topic:

Para mandar el mensaje Hola al topic Alerts, el comando sería el siguiente:

`node productor.js Alerts Hola`

##Tolerancia a fallos del orquestador
El primer orquestador en conectarse al router es elegido como orquestador principal. Toda la comunicación del router va al orquestador principal solamente. En caso de caida del orquestador principal, el otro orquestador que esta conectado pasa a ser el principal. Cuando esto ocurre, actualiza sus variables en memoria para poder empezar a atender los pedidos.

Nota: la configuración de los endpoints y colas con la que se levanta cada datanode se puede encontrar en el archivo config.json.



