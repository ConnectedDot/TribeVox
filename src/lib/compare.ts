export { normalizeWords, stripSpokenScriptureReferences } from "../recognition/normalization";
export { accuracy, progress } from "../recognition/scoring";
export { speechToLettersSmart as speechToLetters } from "../recognition/SpellingMatcher";
import { matchRecitation } from "../recognition/RecitationMatcher";
import { matchSpelling } from "../recognition/SpellingMatcher";
export function alignWords(expectedText:string,spokenText:string,hasInterim=false,reference=""){return matchRecitation(expectedText,spokenText,reference,{interim:hasInterim}).tokens;}
export function compareLetters(expectedWord:string,transcript:string,interim=false){return matchSpelling(expectedWord,transcript,interim).tokens;}
