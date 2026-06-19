export function kzDifficulty(difficulty: string): string {
  switch (difficulty) {
    case "BEGINNER":
      return "Қарапайым";
    case "INTERMEDIATE":
      return "Орташа";
    case "ADVANCED":
      return "Күрделі";
    default:
      return difficulty;
  }
}

export function kzBodyZone(zone: string): string {
  switch (zone) {
    case "HEAD":
      return "Бас";
    case "NECK":
      return "Мойын";
    case "CHEST":
      return "Кеуде";
    case "ABDOMEN":
      return "Қарын";
    case "BACK":
      return "Арқа";
    case "LEFT_ARM":
      return "Сол қол";
    case "RIGHT_ARM":
      return "Оң қол";
    case "LEFT_HAND":
      return "Сол алақан";
    case "RIGHT_HAND":
      return "Оң алақан";
    case "LEFT_LEG":
      return "Сол аяқ";
    case "RIGHT_LEG":
      return "Оң аяқ";
    case "LEFT_FOOT":
      return "Сол табан";
    case "RIGHT_FOOT":
      return "Оң табан";
    case "PELVIS":
      return "Жамбас";
    case "SKIN":
      return "Тері";
    case "EYES":
      return "Көздер";
    case "EARS":
      return "Құлақтар";
    case "NOSE":
      return "Мұрын";
    case "MOUTH":
      return "Ауыз";
    case "THROAT":
      return "Тамақ";
    case "FULL_BODY":
      return "Бүкіл дене";
    default:
      return zone;
  }
}
