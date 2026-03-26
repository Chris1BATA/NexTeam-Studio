import { AVATAR_STATES } from "../constants/avatarStates";

export function useAvatarState(conversationState) {
  const mapping = {
    [AVATAR_STATES.IDLE]: "idle",
    [AVATAR_STATES.LISTENING]: "listening",
    [AVATAR_STATES.THINKING]: "idle",
    [AVATAR_STATES.SPEAKING]: "speaking",
    [AVATAR_STATES.REACT_POSITIVE]: "speaking",
    [AVATAR_STATES.REACT_NEGATIVE]: "idle"
  };

  return { riveInputName: mapping[conversationState] || "idle" };
}
