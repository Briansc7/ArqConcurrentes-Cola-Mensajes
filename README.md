# ArqConcurrentes-Cola-Mensajes

El presente proyecto consiste en una cola de mensajes distribuida para la asignatura Implementación de Arquitecturas de Software Concurrentes.

La arquitectura propuesta para la implementación de la cola de mensajes distribuida se puede ver en el siguiente documento:
https://docs.google.com/document/d/1MhVP62zThtl572oQ4QjxKktykTekvo6cxefDcAEqDM4

El proyecto fue desarrollado en NodeJs, por lo que para poder utilizarlo hay que instalar el entorno correspondiente. Para ello se debe seguir los pasos del siguiente tutorial:
http://arquitecturas-concurrentes.github.io/guias/node/

## Pasos para probar la aplicación:

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

{

	"topic": "Test",
	
	"mode": "RR",
	
	"maxSize": 10,
	
	"datanode": "nodo_datos1"	
	
}

Siendo topic el nombre del tema para la cola, mode el modo de la cola que puede ser RR (round Robin) o PubSub, maxSize el limite de mensajes para la cola, y datanode el nombre del nodo de datos en donde se desea crear la cola.

4) Levantar un consumidor especificando el topic al cual desea suscribirse.

Para suscribirse a Alerts, el comando sería el siguiente:

`node consumidor.js Alerts`

5) Levantar un productor y mandar un mensaje a un topic:

Para mandar el mensaje Hola al topic Alerts, el comando sería el siguiente:

`node productor.js Alerts Hola`

## Tolerancia a fallos del orquestador
El primer orquestador en conectarse al router es elegido como orquestador principal. Toda la comunicación del router va al orquestador principal solamente. En caso de caida del orquestador principal, el otro orquestador que esta conectado pasa a ser el principal. Cuando esto ocurre, actualiza sus variables en memoria para poder empezar a atender los pedidos.

## Tolerancia a fallos de los nodos de datos
Los nodos de datos tienen en memoria sus colas y también una copia de las colas del otro nodo de datos.

Ambos nodos de datos se comunican entre sí. Cuando un nodo recibe un dato en una cola, recibe la creación de una nueva cola o se consumen los datos de una de sus colas, replica esta actualización a la copia en memoria que tiene el otro nodo de datos. 

Cuando un nodo de datos se cae, el otro nodo detecta su caída y también detecta cuando se vuelve a reconectar. Cuando el nodo de datos caído se reconecta, recibe una solicitud de ejecutar la recuperación ante desastres en la cual recibe los datos actualizados de sus colas propias y también la réplica de las colas del otro nodo de datos. Con lo cual, el nodo de datos actualiza su estado y queda listo para seguir funcionando como antes.

En caso de que existan consumidores suscriptos al nodo caído, cuando el nodo de datos se vuelve a levantar, los consumidores se vuelven a suscribir. En la recuperación de los datos, sólo se recuperan los datos de las colas y no los suscriptores por ser sus sockets inválidos por la caída. Es por ello que los consumidores se vuelven a suscribir automáticamente. 

En el caso en que el que se caiga sea el consumidor y no el nodo de datos, se lo quita de la lista de suscriptores del tópic correspondiente para ya no seguir intentando mandarle mensajes a un socket inválido.



Nota: la configuración de los endpoints de todos los componentes y las colas con las que se levanta cada datanode (excepto los datos guardados en las colas) se puede encontrar en el archivo config.json.



