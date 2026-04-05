const tmi = require('tmi.js');
require("dotenv").config();
const {OBSWebSocket} = require('obs-websocket-js');
const obs = new OBSWebSocket();
const WebSocket = require("ws");
const fetch = require("node-fetch");
const eventsub = new WebSocket("wss://eventsub.wss.twitch.tv/ws");
const fs = require('fs');
const { channel } = require('tmi.js/lib/utils');
var chan;
var DatMech 
var J8Ball

fs.readFile('mecha.json', 'utf8', (err, jsonString) => {
   if (err) {
     console.error('Error al leer archivo:', err);
     return;
   }
   try {
     const DataMech = JSON.parse(jsonString);
     DatMech=DataMech
     console.log('Datos cargados:', DataMech); // objeto JS
   } catch (err) {
     console.error('Error al parsear JSON:', err);
   }
});
fs.readFile('8Ball.json', 'utf8', (err, jsonString) => {
   if (err) {
     console.error('Error al leer archivo:', err);
     return;
   }
   try {
     const J8ball = JSON.parse(jsonString);
     J8Ball=J8ball
     console.log('Datos cargados:', J8ball); // objeto JS
   } catch (err) {
     console.error('Error al parsear JSON:', err);
   }
});


obs.connect(
    `ws://${process.env.OBS_IP}:${process.env.OBS_PORT}`, process.env.OBS_PASSWORD
)
.then(() => console.log("Conectado a OBS!"))
.catch(err => console.error("Error al conectar a OBS:", err));


eventsub.on("open", () => {
  console.log("Conectado a Twitch");
});

var esc = "";

obs.on('Identified', async () => {
    try {
    const data = await obs.call('GetCurrentProgramScene');
    const currentProgramSceneName = data.currentProgramSceneName;
    esc = currentProgramSceneName;

    console.log('Escena activa:', currentProgramSceneName);
    listarItemsDeEscena(currentProgramSceneName);
    //listarItemsDentroDeGrupo('Bot', currentProgramSceneName);
  } catch (err) {
    console.error('Error obteniendo escena actual:', err);
  }
});

obs.on('CurrentProgramSceneChanged', async (data) => {
  console.log('🎬 Escena cambió a:', data.sceneName);
  await actualizarEscenaYBot();
});

const client = new tmi.Client({
	options: { debug: true },
	identity: {
		username: process.env.TB_USERNAME,
		password: process.env.TB_AT,
	},
	channels: [process.env.CHANNEL_NAME]//TODO: poner esto en el env
});
const commands={
"!dado": (channel, tags) => 
  {
    const result = Math.floor(Math.random() * 6) + 1;

    if(result == 1)
    {
      client.say(channel, `@${tags.username}, sacaste un 1, eso no es bueno`).catch(err => console.error('Error enviando mensaje:', err));
    }
    else if(result>1 && result<6) 
    {
      client.say(channel, `@${tags.username}, sacaste un ${result}!`).catch(err => console.error('Error enviando mensaje:', err));
    } 
    else 
    {
      client.say(channel, `@${tags.username}, sacaste un 6! que impresionante eres`).catch(err => console.error('Error enviando mensaje:', err));
    }
    dado(result);
  },

  "!vod": (channel) => 
    {
    client.say(channel, `El canal de VODs es https://youtube.com/@PlayItCharlesVODS!`);
  },

  "!hola": (channel, tags) => 
    {
      client.say(channel, `@${tags.username}, bienvenido al chat!`);
      sonidos("Hola");
    },
  "!clap":() =>
    {
      sonidos("Aplausos");
    },
  "!test":()=>
    {

    },
  "!pet":()=>
    {
      AnimacionesEx("pet",3000);
    },
  "!comida":()=>
    {
      const result = Math.floor(Math.random() * 5) + 1;
      AnimacionesEx(`minecraft${result}`,4000);//minecraft5
    },
  "!dance":()=>
    {
      AnimacionesEx("baile")
    },
    "!cry":()=>
    {
      AnimacionesEx("cry",10000);
    },
  "!8ball":(channel)=>
    {
      client.say(channel, `${(J8Ball.frases[(Math.floor(Math.random() * J8Ball.frases.length))])}`);
    },
  "!adios":(channel,tags)=>
    {
      client.say(channel, `Bueno @${tags.username}, nos vemos, que descanses!`);
    },
  "!dabmeup":(channel,tags,message)=>
    {
      const mencion = message.match(/@(\w+)/);
      console.log(mencion)
      client.say(channel, `@${tags.username} saluda a @${mencion[1]}`);
      AnimacionesEx("DabUp",10000);
    },
  "!abrazo":(channel,tags,message)=>
    {
      const mencion = message.match(/@(\w+)/);
      console.log(mencion)
      client.say(channel, `@${tags.username} abraza a @${mencion[1]}`);
      AnimacionesEx("abrazo",10000);
    },
  "!build":(channel, tags, args)=>//!build brazos
    {
      const arg = args.trim().split(/\s+/);
      console.log(arg)
      const piezaMech = arg[1].trim().toLowerCase();
      console.log(piezaMech);
      if(DatMech.Partes.includes(piezaMech))
        {console.log(piezaMech)
          if(DatMech.PartesEnc.includes(piezaMech))
            {
              client.say(channel, `@${tags.username}, esa parte ya fue encontrada, prueba otra`);
            } else
            {
              DatMech.PartesEnc.push(piezaMech);
              fs.writeFile('mecha.json', JSON.stringify(DatMech, null, 2), (err) => {
                if (err) {
                  console.error('Error al escribir archivo:', err);
                } else {
                  client.say(channel, `@${tags.username}, Lo lograste, encontraste la pieza ${piezaMech}!`);
                }
              });
              if(DatMech.Partes.lenght===DatMech.PartesEnc.lenght)
                {
                  //TODO, una animacion bien epica
                }
            }
            
        } else
          {
            client.say(channel, `@${tags.username}, nope, esa pieza no existe, trata otra`);
          }
    },

}
client.connect();
client.on('message', (channel, tags, message, self) => {
	if(self) return;

  const args = message.trim().split(/\s+/);
	const command = args[0].trim().toLowerCase();
  chan = channel;

    if(commands[command]) {
        commands[command](channel, tags, message);
    }
  
});
eventsub.on("message", async (raw) => {
  const msg = JSON.parse(raw);
  if (msg.metadata?.message_type === "notification") {
  console.log(JSON.stringify(msg, null, 2));
  }
  if (msg.metadata?.message_type === "session_welcome") {
    const sessionId = msg.payload.session.id;
    console.log("Session ID:", sessionId);
    await SuscFollow(sessionId);
    await SuscRaid(sessionId);
    await SuscUpdate(sessionId);
  }
  if (msg.metadata?.message_type === "session_welcome") {
  console.log(JSON.stringify(msg, null, 2));
  }
  if (msg.metadata?.message_type === "notification") {
    const event = msg.payload.event;
    const type = msg.payload.subscription.type;
    if (type === "channel.follow") {
      N_Follow(event.user_name)
    }
    if (type === "channel.raid") {
      N_Raid(event.from_broadcaster_user_name,event.viewers)
    }
    if (type==="channel.update"){
      N_Update(event.title,event.category_name)
    }
  }
});
async function actualizarEscenaYBot() {
  try {
    const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
    console.log('Escena activa:', currentProgramSceneName);
    
    listarItemsDeEscena(currentProgramSceneName);
    //listarItemsDentroDeGrupo('Bot', currentProgramSceneName);
    esc = currentProgramSceneName;
  } catch (err) {
    console.error('Error actualizando:', err);
  }
}
async function IdPorNombre(nombre) {
  try {
    const res = await obs.call("GetGroupSceneItemList", {
      sceneName: "Bot"
    });
    item = res.sceneItems.find(
    i => i.sourceName === nombre
    );
    //console.log(item.sceneItemId);
    return item.sceneItemId;

  } catch (err) {
    console.error("Error obteniendo items:", err);
  }
}
async function listarItemsDentroDeGrupo(grupoNombre, escenaActual) {
  try {
    const { sceneItems } = await obs.call('GetGroupSceneItemList', {
      sceneName: grupoNombre  // "Bot"
    });
    
    console.log(`Items DENTRO del grupo "${grupoNombre}":`);
    sceneItems.forEach(item => {
      console.log(`  ID: ${item.sceneItemId} | Nombre: ${item.sourceName}`);
    });
  } catch (err) {
    console.error('Error listando items del grupo:', err);
  }
}
async function SuscFollow(sessionId) {
  await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
    method: "POST",
    headers: {
      "Client-ID": process.env.CLIENT_ID,
      "Authorization": `Bearer ${process.env.ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      type: "channel.follow",
      version: "2",
      condition: {
        broadcaster_user_id: process.env.BROADCASTER_ID
      },
      transport: {
        method: "websocket",
        session_id: sessionId
      }
    })
  });
  

}
async function SuscRaid(sessionId) {
  await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
    method: "POST",
    headers: {
      "Client-ID": process.env.CLIENT_ID,
      "Authorization": `Bearer ${process.env.ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      type: "channel.raid",
      version: "1",
      condition: {
        to_broadcaster_user_id: process.env.BROADCASTER_ID
      },
      transport: {
        method: "websocket",
        session_id: sessionId
      }
    })
  });

}
async function SuscUpdate(sessionId) {
  await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
    method: "POST",
    headers: {
      "Client-ID": process.env.CLIENT_ID,
      "Authorization": `Bearer ${process.env.ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      type: "channel.update",
      version: "2",
      condition: {
        broadcaster_user_id: process.env.BROADCASTER_ID
      },
      transport: {
        method: "websocket",
        session_id: sessionId
      }
    })
  });

}
async function dado(number){
    if(number==1)
      {
        AnimacionesEx("Boom",3500)
      }
    else if (number<6 && number>1)
      {
        sonidos("Yippee")//TODO: agregar de menor a 3 waaaaaaaa
      }
    else
      {
        AnimacionesEx("6",4000)
        sonidos("Aplausos");
    }
}
async function listarItemsDeEscena(sceneName) {
  try {
    const res = await obs.call("GetSceneItemList", {
      sceneName: sceneName
    });
    console.log(`Items de la escena ${sceneName}:`);
    res.sceneItems.forEach(item => {
      console.log(`ID: ${item.sceneItemId} | Nombre: ${item.sourceName}`);
    });

  } catch (err) {
    console.error("Error obteniendo items:", err);
  }
}
async function verHotkeys() {
  const list = await obs.call("GetHotkeyList");
  console.log(JSON.stringify(list, null, 2));
}
async function N_Follow(Nombre) {
  console.log("follow");
  AnimacionesEx("baile")
  await obs.call("SetInputSettings", { //TODO: crear funcion de texto
        inputName: "Texto",
        inputSettings: {
            text: `Gracias por seguir, ${Nombre}!` //cambia el texto a gracias por seguir
        }
    });
        setTimeout(async () => {
  await obs.call("SetInputSettings", {
        inputName: "Texto",
        inputSettings: {
            text: ``
        }
    });
  }, 5000);
}
async function N_Raid(Nombre,cantidad) {
  console.log("follow");
  AnimacionesEx("baile")  
  await obs.call("SetInputSettings", {
        inputName: "Texto", //es el mismo que de seguidores porque soy recursivo
        inputSettings: {
            text: `Raid de ${Nombre}!, 
            con una cantidad de ${cantidad} personas!`
        }
    });
        setTimeout(async () => {
  await obs.call("SetInputSettings", {
        inputName: "Texto",
        inputSettings: {
            text: ``
        }
        }, 10000);
  
    });
}
async function N_Update(titulo,categoria) {
  console.log("update");
  client.say(chan, `nuevo tema: titulo-->${titulo} y categoria-->${categoria}, ojala sigas disfrutando`);
}//puedo juntarlos en una nueva funcion creo // tras consideracion no puedo

//----Funciones de activar cosas juntadas---- re profesional poniendo separaciones si o no

// async function Texto(Texto,extra?,tiempo) { //TODO 
//}
async function sonidos(Nombre) {
  await obs.call("TriggerMediaInputAction", {
        inputName: Nombre,
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART"
        });
}
async function AnimacionesEx(Nombre,tiempo=10000) {//para dance, pet y comida, TODO agregar timeout personalizable
  const nom = await IdPorNombre(Nombre);
    //console.log(nom)
    await obs.call('SetSceneItemEnabled', {
          sceneName: "Bot",
          sceneItemId: nom,
          sceneItemEnabled: true
          });

        setTimeout(async () => {
        await obs.call('SetSceneItemEnabled', {
            sceneName: "Bot",
            sceneItemId: nom,
            sceneItemEnabled: false
            });
        }, tiempo);
}
//!sunny: gafas de sol, !abrazo @user: sale animacion y mensaje en el chat
//boss(el mas potente que he pensado): con !hit alto,medio,bajo enfrentas a un jefe y su vida baja en el obs
//primer mensaje: este toca, 
//!pez rotatorio