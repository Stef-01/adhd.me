import '../../../../styles/lives-kit.css';
import '../../../../styles/zoe-world.css';
import type { Metadata } from 'next';
import { ZoeWorldGame } from '../../../../lives/zoe-world/player';
import { ROBOTS_META } from '@/security/robots';
export const metadata:Metadata={title:'Zoe: Before you send — ADHD Lives',description:'Build a workable plan together, keep a draft and practise returning to a changed conversation.',alternates:{canonical:'/lives/play/zoe-before-you-send'},robots:ROBOTS_META};
export default function Page(){return <main id="main-content"><ZoeWorldGame/></main>}
