#!/usr/bin/env bash
# =============================================================================
# maskani-ui build and deploy
#   ./build.sh               build only
#   DEPLOY=true ./build.sh   build, push, and bump the image tag in devops-k8s (CI only)
# Never run DEPLOY=true by hand; deploys go through the GitHub workflow.
# =============================================================================
set -euo pipefail

info()    { echo -e "\033[0;34m[INFO]\033[0m $1"; }
success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
warn()    { echo -e "\033[1;33m[WARN]\033[0m $1"; }

APP_NAME=${APP_NAME:-"maskani-ui"}
NAMESPACE=${NAMESPACE:-"maskani"}
DEPLOY=${DEPLOY:-false}
REGISTRY_SERVER=${REGISTRY_SERVER:-docker.io}
REGISTRY_NAMESPACE=${REGISTRY_NAMESPACE:-codevertex}
IMAGE_REPO="${REGISTRY_SERVER}/${REGISTRY_NAMESPACE}/${APP_NAME}"
DEVOPS_REPO=${DEVOPS_REPO:-"Bengo-Hub/devops-k8s"}
DEVOPS_DIR=${DEVOPS_DIR:-"$HOME/devops-k8s"}
GIT_EMAIL=${GIT_EMAIL:-"dev@bengobox.com"}
GIT_USER=${GIT_USER:-"Maskani UI Bot"}

if [[ -z ${GITHUB_SHA:-} ]]; then
  GIT_COMMIT_ID=$(git rev-parse --short=8 HEAD || echo "localbuild")
else
  GIT_COMMIT_ID=${GITHUB_SHA::8}
fi
KUBE_CONFIG=${KUBE_CONFIG:-${KUBE_CONFIG_B64:-}}

# Public build-time values (baked into the bundle). Defaults are production hosts.
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-"https://maskaniapi.codevertexafrica.com"}
NEXT_PUBLIC_SSO_URL=${NEXT_PUBLIC_SSO_URL:-"https://sso.codevertexafrica.com"}
NEXT_PUBLIC_SSO_CLIENT_ID=${NEXT_PUBLIC_SSO_CLIENT_ID:-"maskani-ui"}
NEXT_PUBLIC_AUTH_UI_URL=${NEXT_PUBLIC_AUTH_UI_URL:-"https://accounts.codevertexafrica.com"}
NEXT_PUBLIC_TREASURY_API_URL=${NEXT_PUBLIC_TREASURY_API_URL:-"https://booksapi.codevertexafrica.com"}
NEXT_PUBLIC_TREASURY_UI_URL=${NEXT_PUBLIC_TREASURY_UI_URL:-"https://books.codevertexafrica.com"}
NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL=${NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL:-"https://pricing.codevertexafrica.com"}
NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-"https://maskaniapp.codevertexafrica.com"}

info "Building ${APP_NAME}:${GIT_COMMIT_ID}"

if [[ ${DEPLOY} == "true" ]]; then
  SYNC_SCRIPT=$(mktemp)
  if curl -fsSL "https://raw.githubusercontent.com/${DEVOPS_REPO}/main/scripts/tools/check-and-sync-secrets.sh" -o "$SYNC_SCRIPT" 2>/dev/null; then
    # shellcheck disable=SC1090
    source "$SYNC_SCRIPT"
    check_and_sync_secrets "REGISTRY_USERNAME" "REGISTRY_PASSWORD" "KUBE_CONFIG" || warn "Secret sync failed"
    rm -f "$SYNC_SCRIPT"
  else
    warn "Unable to download secret sync script"
  fi
fi

DOCKER_BUILDKIT=1 docker build . -t "${IMAGE_REPO}:${GIT_COMMIT_ID}" \
  --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  --build-arg NEXT_PUBLIC_SSO_URL="$NEXT_PUBLIC_SSO_URL" \
  --build-arg NEXT_PUBLIC_SSO_CLIENT_ID="$NEXT_PUBLIC_SSO_CLIENT_ID" \
  --build-arg NEXT_PUBLIC_AUTH_UI_URL="$NEXT_PUBLIC_AUTH_UI_URL" \
  --build-arg NEXT_PUBLIC_TREASURY_API_URL="$NEXT_PUBLIC_TREASURY_API_URL" \
  --build-arg NEXT_PUBLIC_TREASURY_UI_URL="$NEXT_PUBLIC_TREASURY_UI_URL" \
  --build-arg NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL="$NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL" \
  --build-arg NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL"
success "Docker build complete"

if [[ ${DEPLOY} != "true" ]]; then
  success "Done (build only)"
  exit 0
fi

if [[ -n ${REGISTRY_USERNAME:-} && -n ${REGISTRY_PASSWORD:-} ]]; then
  echo "$REGISTRY_PASSWORD" | docker login "$REGISTRY_SERVER" -u "$REGISTRY_USERNAME" --password-stdin
fi
docker push "${IMAGE_REPO}:${GIT_COMMIT_ID}"
success "Image pushed"

if [[ -n ${KUBE_CONFIG:-} ]]; then
  mkdir -p ~/.kube
  echo "$KUBE_CONFIG" | base64 -d > ~/.kube/config 2>/dev/null || echo "$KUBE_CONFIG" > ~/.kube/config
  chmod 600 ~/.kube/config
  export KUBECONFIG=~/.kube/config
  kubectl get ns "$NAMESPACE" >/dev/null 2>&1 || kubectl create ns "$NAMESPACE"
  if [[ -n ${REGISTRY_USERNAME:-} && -n ${REGISTRY_PASSWORD:-} ]]; then
    kubectl -n "$NAMESPACE" create secret docker-registry registry-credentials \
      --docker-server="$REGISTRY_SERVER" --docker-username="$REGISTRY_USERNAME" --docker-password="$REGISTRY_PASSWORD" \
      --dry-run=client -o yaml | kubectl apply -f - || warn "registry-credentials apply failed"
  fi
  # maskani-ui-secrets (INTERNAL_SERVICE_KEY) is created by devops-k8s create-service-secrets.sh, not here.
fi

if [[ ! -d "$DEVOPS_DIR" ]]; then
  TOKEN="${GH_PAT:-${GITHUB_TOKEN:-}}"
  CLONE_URL="https://github.com/${DEVOPS_REPO}.git"
  [[ -n $TOKEN ]] && CLONE_URL="https://x-access-token:${TOKEN}@github.com/${DEVOPS_REPO}.git"
  git clone "$CLONE_URL" "$DEVOPS_DIR" || warn "Unable to clone devops-k8s"
fi

# shellcheck disable=SC1091
source "${DEVOPS_DIR}/scripts/helm/update-values.sh" 2>/dev/null || warn "update-values.sh not found"
if declare -f update_helm_values >/dev/null 2>&1; then
  export GIT_EMAIL GIT_USER
  update_helm_values "$APP_NAME" "$GIT_COMMIT_ID" "$IMAGE_REPO" || warn "Helm values update failed"
elif [[ -f "${DEVOPS_DIR}/scripts/tools/update-helm-values.sh" ]]; then
  chmod +x "${DEVOPS_DIR}/scripts/tools/update-helm-values.sh"
  "${DEVOPS_DIR}/scripts/tools/update-helm-values.sh" "$APP_NAME" "$GIT_COMMIT_ID" || warn "Helm values update failed"
fi

success "Done"
