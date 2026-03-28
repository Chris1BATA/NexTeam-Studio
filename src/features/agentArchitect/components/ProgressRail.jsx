import { STAGES } from "../constants/stages";

const styles = {
  rail: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 180
  },
  item: (active, complete) => ({
    padding: "8px 10px",
    borderRadius: 10,
    background: active ? "#EEF2FF" : "#F9FAFB",
    color: active ? "#4338CA" : complete ? "#166534" : "#6B7280",
    border: `1px solid ${active ? "#C7D2FE" : "#E5E7EB"}`,
    fontSize: 13,
    fontWeight: active ? 700 : 500
  })
};

export function ProgressRail({ currentStage = STAGES.BUSINESS_NAME }) {
  const stageList = Object.values(STAGES);
  const currentIndex = stageList.indexOf(currentStage);

  return (
    <div style={styles.rail}>
      {stageList.map((stage, index) => (
        <div key={stage} style={styles.item(index === currentIndex, index < currentIndex)}>
          {stage.replaceAll("_", " ")}
        </div>
      ))}
    </div>
  );
}
