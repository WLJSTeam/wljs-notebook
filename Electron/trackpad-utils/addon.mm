#import <AppKit/AppKit.h>
#import <Foundation/Foundation.h>
#include <napi.h>
#import <objc/runtime.h>

Napi::ThreadSafeFunction tsfnBegan = NULL;
void (*callbackBegan)(Napi::Env env, Napi::Function jsCallback);

Napi::ThreadSafeFunction tsfnEnded = NULL;
void (*callbackEnded)(Napi::Env env, Napi::Function jsCallback);

Napi::ThreadSafeFunction tsfnForceClick;
void (*callbackForceClick)(Napi::Env env, Napi::Function jsCallback);

NSDate *lastBeganDate;
NSDate *lastEndedDate;
BOOL began = true;

int lastPressureStage = 0;

@implementation NSEvent (TrackpadScroll)

+ (void)load {
	static dispatch_once_t onceToken;
	dispatch_once(&onceToken, ^{
	  Class theClass = [self class];

	  SEL originalSelector = @selector(deltaY);
	  SEL swizzledSelector = @selector(my_deltaY);

	  Method originalMethod = class_getInstanceMethod(theClass, originalSelector);
	  Method swizzledMethod = class_getInstanceMethod(theClass, swizzledSelector);

	  IMP originalImp = method_getImplementation(originalMethod);
	  IMP swizzledImp = method_getImplementation(swizzledMethod);

	  class_replaceMethod(theClass, swizzledSelector, originalImp, method_getTypeEncoding(originalMethod));
	  class_replaceMethod(theClass, originalSelector, swizzledImp, method_getTypeEncoding(swizzledMethod));
	});
}

- (CGFloat)my_deltaY {
	if (self.type == NSEventTypeScrollWheel) {
		if ([self phase] == NSEventPhaseBegan) {
			if (lastBeganDate == nil || [lastBeganDate timeIntervalSinceNow] < -0.002) {
				if (tsfnBegan != NULL) {
					tsfnBegan.BlockingCall(callbackBegan);
				}
			}
			lastBeganDate = [NSDate date];
			began = true;
		} else if ([self phase] == NSEventPhaseEnded && began == true) {
			if (lastEndedDate == nil || [lastEndedDate timeIntervalSinceNow] < -0.002) {
				if (tsfnEnded != NULL) {
					tsfnEnded.BlockingCall(callbackEnded);
				}
			}
			lastEndedDate = [NSDate date];
			began = false;
		}
	}
	return [self my_deltaY];
}

@end

@implementation NSWindow (TrackpadUtils)

+ (void)load {
	[[NSOperationQueue mainQueue] addOperationWithBlock:^{
	  Class theClass = [self class];

	  SEL originalSelector = @selector(sendEvent:);
	  SEL swizzledSelector = @selector(my_sendEvent:);

	  Method originalMethod = class_getInstanceMethod(theClass, originalSelector);
	  Method swizzledMethod = class_getInstanceMethod(theClass, swizzledSelector);

	  IMP originalImp = method_getImplementation(originalMethod);
	  IMP swizzledImp = method_getImplementation(swizzledMethod);

	  class_replaceMethod(theClass, swizzledSelector, originalImp, method_getTypeEncoding(originalMethod));
	  class_replaceMethod(theClass, originalSelector, swizzledImp, method_getTypeEncoding(swizzledMethod));
	}];
}

- (void)my_sendEvent:(NSEvent *)event {
	if (event.type == NSEventTypePressure && event.pressureBehavior == NSPressureBehaviorPrimaryDeepClick) {
		if (lastPressureStage == 1 && event.stage == 2 && tsfnForceClick != NULL && callbackForceClick != NULL) {
			tsfnForceClick.BlockingCall(callbackForceClick);
		}
		lastPressureStage = event.stage;
	}
	[self my_sendEvent:event];
}

@end

void setupBegan(const Napi::CallbackInfo &info) {
	Napi::Env env = info.Env();
	tsfnBegan = Napi::ThreadSafeFunction::New(env, info[0].As<Napi::Function>(), "Began", 0, 1);
	callbackBegan = [](Napi::Env env, Napi::Function jsCallback) { jsCallback.Call({}); };
}

void setupEnded(const Napi::CallbackInfo &info) {
	Napi::Env env = info.Env();
	tsfnEnded = Napi::ThreadSafeFunction::New(env, info[0].As<Napi::Function>(), "Ended", 0, 1);
	callbackEnded = [](Napi::Env env, Napi::Function jsCallback) { jsCallback.Call({}); };
}

void setupForceClick(const Napi::CallbackInfo &info) {
	Napi::Env env = info.Env();
	if (info.Length() > 0 && info[0].IsFunction()) {
		tsfnForceClick = Napi::ThreadSafeFunction::New(env, info[0].As<Napi::Function>(), "ForceClick", 0, 1);
		callbackForceClick = [](Napi::Env env, Napi::Function jsCallback) { jsCallback.Call({}); };
	} else {
		tsfnForceClick = NULL;
		callbackForceClick = NULL;
	}
}

void triggerFeedback(const Napi::CallbackInfo &info) {
	NSHapticFeedbackPattern pattern = NSHapticFeedbackPatternAlignment;
	if (info.Length() > 0 && info[0].IsNumber()) {
		const Napi::Number value = info[0].As<Napi::Number>();
		const int32_t requested = value.Int32Value();
        switch (requested) {
            case 0: pattern = NSHapticFeedbackPatternGeneric; break;
            case 1: pattern = NSHapticFeedbackPatternAlignment; break;
            case 2: pattern = NSHapticFeedbackPatternLevelChange; break;
        }
	}

	[[NSHapticFeedbackManager defaultPerformer] performFeedbackPattern:pattern
							   performanceTime:NSHapticFeedbackPerformanceTimeNow];
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
	exports.Set(Napi::String::New(env, "onTrackpadScrollBegan"), Napi::Function::New(env, setupBegan));
	exports.Set(Napi::String::New(env, "onTrackpadScrollEnded"), Napi::Function::New(env, setupEnded));
	exports.Set(Napi::String::New(env, "onForceClick"), Napi::Function::New(env, setupForceClick));
	exports.Set(Napi::String::New(env, "triggerFeedback"), Napi::Function::New(env, triggerFeedback));
	return exports;
};

NODE_API_MODULE(addon, Init);
