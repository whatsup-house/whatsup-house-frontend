import ErrorScreen from '@/components/layout/ErrorScreen'

// 404 — 존재하지 않는 경로 또는 notFound() 호출 시. 앱 셸(헤더/바텀내비) 안에 표시. (KAN-248)
export default function NotFound() {
  return (
    <ErrorScreen
      code="404"
      title="앗! 페이지를 찾을 수 없어요"
      description={'요청하신 페이지가 사라졌거나,\n주소가 잘못 입력되었어요.\n홈으로 돌아가 다시 시작해보세요.'}
      showBack
    />
  )
}
