// /users/:id
export function buildRoutePath(path) {
    const routeParametersRegex = /:([a-zA-Z]+)/g;
    // Modificado para capturar strings mais genéricas, não apenas IDs
    const pathWithParams = path.replaceAll(routeParametersRegex, '(?<$1>[^\/]+)');

    const pathRegex = new RegExp(`^${pathWithParams}(?<query>\\?(.*))?$`);

    return pathRegex;
}
