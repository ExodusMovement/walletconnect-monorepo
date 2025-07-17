import { name, dependencies } from "./package.json";
import createConfig from "../../rollup.config";

const packageDependencies = [
  ...Object.keys(dependencies),
  "@exodus/crypto/curve25519",
  "@exodus/crypto/chacha",
  "@exodus/crypto/hash",
  "@exodus/crypto/hmac",
  "@exodus/crypto/randomBytes",
]

export default createConfig(name, packageDependencies);
