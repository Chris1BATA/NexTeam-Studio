import { executeBragiWordpressDraft } from './src/features/missioncontrol/services/bragiWordpressService.js';
const result = await executeBragiWordpressDraft({
  postId: 3273,
  commentStatus: 'closed',
  pingStatus: 'closed',
  yoast: {
    focusKeyphrase: 'my pool leak seems to have stopped',
    seoTitle: 'My Pool Leak Seems to Have Stopped - Should I Still Get It Inspected? | Aquatrace',
    metaDescription: 'If your pool leak seems to have stopped on its own, do not cancel that inspection. Debris can temporarily plug a leak the same way a stopper seals a drain - and when it shifts, the water loss comes right back.',
    socialTitle: 'Your Pool Leak "Stopped" - But It Probably Didn\'t',
    socialDescription: 'Dirt, silt, and leaves can seal a leaking pool penetration just like a bathtub stopper. The leak is not gone - it is covered. Here is what is really happening and what to do before you cancel your inspection.'
  },
  credentials: {
    siteUrl: 'https://aquatraceleak.com',
    apiUsername: 'aquatrace-bragi',
    apiPassword: 'dVQj lLyc 95Au v7vF 1xXD B6b6',
    editorUsername: 'aquatrace-bragi',
    editorPassword: '!wMnTgL*OI8Lm*PHQk%Pe334'
  }
});
console.log(JSON.stringify(result, null, 2));
