export function renderEmailBody(bodyTemplate: string, fullName: string): string {
  return bodyTemplate.split("{{CANDIDATE_NAME}}").join(fullName);
}
