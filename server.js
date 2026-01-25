const tmi = require('tmi.js');
require("dotenv").config();
const {OBSWebSocket} = require('obs-websocket-js');
const obs = new OBSWebSocket();
const WebSocket = require("ws");
const fetch = require("node-fetch");
const eventsub = new WebSocket("wss://eventsub.wss.twitch.tv/ws");
//const fs = require('fs');

// const data = { nombre: "Juan", edad: 30 };
// const jsonString = JSON.stringify(data, null, 2); // null, 2 para formato legible

// fs.writeFile('datos.json', jsonString, (err) => {
//   if (err) {
//     console.error('Error al escribir archivo:', err);
//   } else {
//     console.log('¡Datos guardados en datos.json!');
//   }
// });
// fs.readFile('datos.json', 'utf8', (err, jsonString) => {
//   if (err) {
//     console.error('Error al leer archivo:', err);
//     return;
//   }
//   try {
//     const data = JSON.parse(jsonString);
//     console.log('Datos cargados:', data); // Aquí tienes el objeto JS
//   } catch (err) {
//     console.error('Error al parsear JSON:', err);
//   }
// });


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
	channels: ['PlayItCharles']
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
      N_Follow("a");
    },
  "!pet":()=>
    {
      AnimacionesEx("pet");
    },
  "!comida":()=>
    {
      const result = Math.floor(Math.random() * 5) + 1;
      AnimacionesEx(`minecraft${result}`);
    },
  "!dance":()=>
    {
      AnimacionesEx("baile")
    },

}


client.connect();
client.on('message', (channel, tags, message, self) => {
	if(self) return;

	const command = message.trim().toLowerCase();

    if(commands[command]) {
        commands[command](channel, tags, message);
    }
});

eventsub.on("message", async (raw) => {
  const msg = JSON.parse(raw);
  if (msg.metadata?.message_type === "session_welcome") {
    const sessionId = msg.payload.session.id;
    console.log("Session ID:", sessionId);
    await SuscFollow(sessionId);
    await SuscRaid(sessionId);
    await SuscUpdate(sessionId);
  }
  if (msg.metadata?.message_type === "notification") {
    const { type, event } = msg.payload;
    if (type === "channel.follow") {
      N_Follow(event.user_name)
    }
    if (type === "channel.raid") {
      N_Raid(event.from_broadcaster_user_name,event.viewers)
    }
    if (type==="channel.update"){
      N_Update(event.from_broadcaster_user_name,event.title,event.category_name)
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
async function IdPorNombre(nombre,escena) {
  try {
    const res = await obs.call("GetGroupSceneItemList", {
      sceneName: "Bot"
    });
    item = res.sceneItems.find(
    i => i.sourceName === nombre
    );
    console.log(item.sceneItemId);

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
        to_broadcaster_user_id: process.env.BROADCASTER_ID
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
        const nom = await IdPorNombre("explosion",esc);
        await obs.call('SetSceneItemEnabled', {
        sceneName: "Bot",
        sceneItemId: nom, //cambiar esto a cual sea el id del objeto que quieres borrar, yo lo tengo en 7
        sceneItemEnabled: true
        });

        setTimeout(async () => {
        await obs.call('SetSceneItemEnabled', {
            sceneName: "Bot",
            sceneItemId: nom,
            sceneItemEnabled: false
            });
        }, 3000);
      }
    else if (number<6 && number>1)
      {
        sonidos("Yippee")//TODO: agregar de menor a 3 waaaaaaaa
      }
    else
      {
        const nom = await IdPorNombre("6",esc);
        await obs.call('SetSceneItemEnabled', {
        sceneName: "Bot",
        sceneItemId: nom,
        sceneItemEnabled: true
        });
        sonidos("Aplausos");
        setTimeout(async () => {
        await obs.call('SetSceneItemEnabled', {
        sceneName: "Bot",
        sceneItemId: nom,
        sceneItemEnabled: false
        });
        }, 3000);
    }
}
async function sonidos(nombre) {
  await obs.call("TriggerMediaInputAction", {
        inputName: nombre,
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART"
        });
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
  const nom = await IdPorNombre(nombre,esc);
  await obs.call('SetSceneItemEnabled', {
        sceneName: "Bot",
        sceneItemId: nom, //cambiar esto a cual sea el id del objeto que quieres borrar, yo lo tengo en 7
        sceneItemEnabled: true
        });
  await obs.call("SetInputSettings", {
        inputName: "Texto",
        inputSettings: {
            text: `¡Gracias por seguir, ${Nombre}!` //cambia el texto a gracias por seguir
        }
    });
  

        setTimeout(async () => {
  await obs.call('SetSceneItemEnabled', {
        sceneName: "Bot",
        sceneItemId: nom,
        sceneItemEnabled: false
        });
        
  await obs.call("SetInputSettings", {
        inputName: "Texto",
        inputSettings: {
            text: ``
        }
    });
  }, 3000);
}
async function N_Raid(Nombre,cantidad) {
  const nom = await IdPorNombre(nombre,esc);
    await obs.call('SetSceneItemEnabled', {
        sceneName: "Bot",
        sceneItemId: nom, //cambiar esto a cual sea el id del objeto que quieres borrar, yo lo tengo en 7
        sceneItemEnabled: true
        });
  await obs.call("SetInputSettings", {
        inputName: "Texto", //es el mismo que de seguidores porque soy recursivo
        inputSettings: {
            text: `Raid de ${Nombre}!, 
            con una cantidad de ${cantidad} personas!`
        }
    });
        setTimeout(async () => {
  await obs.call('SetSceneItemEnabled', {
        sceneName: "Bot",
        sceneItemId: nom,
        sceneItemEnabled: false
        });
        }, 3000);
  await obs.call("SetInputSettings", {
        inputName: "Texto",
        inputSettings: {
            text: ``
        }
    });
}
async function N_Update(nombre,titulo,categoria) {
  client.say(channel, `nuevo tema: titulo-->${titulo} y categoria-->${categoria}, ojala sigas disfrutando`);
}//puedo juntarlos en una nueva funcion creo// tras consideracion no puedo
async function AnimacionesEx(nombre) {//para dance, pet y comida
  const nom = await IdPorNombre(nombre,esc);
    console.log(nom)
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
        }, 10000);
}
//ideas: !dance: perro bailando, !mecha parte: minijuego para armar un "mecha", al completarse sale una animacion, !pet: se explica solo
//!comida: come un alimento aleatorio de minecraft, !sunny: gafas de sol, !abrazo @user: sale animacion y mensaje en el chat
//boss(el mas potente que he pensado): con !hit alto,medio,bajo enfrentas a un jefe y su vida baja en el obs
//primer mensaje: este toca, 
