export default function Loading() {
  return (
    <div className="theme-section-clean flex min-h-[60vh] items-center justify-center px-5">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 rounded-full border-4 border-turquoise/20 border-t-turquoise motion-safe:animate-spin" />
        <p className="mt-4 text-sm font-black text-turquoise-dark">
          טוען את CleanBrothers
        </p>
      </div>
    </div>
  );
}
