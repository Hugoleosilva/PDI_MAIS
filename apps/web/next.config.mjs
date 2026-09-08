/** @type {import('next').NextConfig} */
const nextConfig = {
  // @pdi-mais/core é consumido como TypeScript cru (sem build próprio).
  transpilePackages: ["@pdi-mais/core"],
};

export default nextConfig;
