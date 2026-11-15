import { websiteChatDeploymentPolicy } from './deployment-policy';
export function isWebsiteChatEnabled() {
  return websiteChatDeploymentPolicy(process.env,'website')!==null;
}
