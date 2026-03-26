import { createMachine } from "xstate";

export const agentArchitectMachine = createMachine({
  id: "agentArchitect",
  initial: "idle",
  states: {
    idle: {
      entry: "onEnterIdle",
      on: {
        BOOT: "booting"
      }
    },
    booting: {
      entry: "onEnterBooting",
      on: {
        BOOT_SUCCESS: "collecting",
        BOOT_FAILURE: "error"
      }
    },
    collecting: {
      entry: "onEnterCollecting",
      on: {
        READY_FOR_INPUT: "awaiting_user",
        FAIL: "error"
      }
    },
    awaiting_user: {
      entry: "onEnterAwaitingUser",
      on: {
        SUBMIT_TURN: "submitting_turn",
        REVIEW: "reviewing",
        FAIL: "error"
      }
    },
    submitting_turn: {
      entry: "onEnterSubmittingTurn",
      on: {
        TURN_ACCEPTED: "streaming_reply",
        SUBMIT_FAILURE: "error"
      }
    },
    streaming_reply: {
      entry: "onEnterStreamingReply",
      on: {
        STREAM_COMPLETE: "extracting_patch",
        STREAM_FAILURE: "error"
      }
    },
    extracting_patch: {
      entry: "onEnterExtractingPatch",
      on: {
        PATCH_EXTRACTED: "persisting_patch",
        EXTRACTION_FAILURE: "error"
      }
    },
    persisting_patch: {
      entry: "onEnterPersistingPatch",
      on: {
        PATCH_PERSISTED: "collecting",
        READY_TO_REVIEW: "reviewing",
        PERSIST_FAILURE: "error"
      }
    },
    reviewing: {
      entry: "onEnterReviewing",
      on: {
        RESUME_COLLECTION: "awaiting_user",
        COMPLETE: "completed",
        FAIL: "error"
      }
    },
    completed: {
      entry: "onEnterCompleted",
      on: {
        RESET: "idle"
      }
    },
    error: {
      entry: "onEnterError",
      on: {
        RETRY: "booting",
        RESET: "idle"
      }
    }
  }
});
