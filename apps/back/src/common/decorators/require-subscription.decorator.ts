import { SetMetadata, type CustomDecorator } from '@nestjs/common'

export const REQUIRE_SUBSCRIPTION_KEY = 'requireSubscription'

export const RequireSubscription = (): CustomDecorator =>
  SetMetadata(REQUIRE_SUBSCRIPTION_KEY, true)
