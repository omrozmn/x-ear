import DemoClient from "./DemoClient";

export function generateStaticParams() {
    return [{ locale: "tr" }, { locale: "en" }];
}

export default function DemoPage() {
    return <DemoClient />;
}
