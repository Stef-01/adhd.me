import type {CharacterId} from './types';
/** Shared public game destinations; both discovery surfaces use the same registry. */
export const GAME_ENTRY:Record<CharacterId,{href:string;label:string;colour:string}>={
 leo:{href:'/lives/play/leo-mosquito',label:'Noise',colour:'#ddd6f0'},
 theo:{href:'/lives/play/theo-out-the-door',label:'Morning',colour:'#f3dfa7'},
 mia:{href:'/lives/play/mia-remember-why',label:'Connections',colour:'#d8c8ee'},
 zoe:{href:'/lives/play/zoe-before-you-send',label:'Messages',colour:'#f0cfdc'},
 arjun:{href:'/lives/play/arjun-hold-the-thread',label:'Meeting',colour:'#d0e0e5'},
 jax:{href:'/lives/play/jax-just-the-list',label:'Shopping',colour:'#e1e7bb'},
 nina:{href:'/lives/play/nina-the-first-line',label:'Writing',colour:'#f4d0b0'},
 maya:{href:'/lives/play/maya-one-thing-at-a-time',label:'Crossing',colour:'#cfe3f5'},
};
